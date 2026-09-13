-- 책숲 Phase 0 — initial schema
-- Mirrors the schema in the project master prompt (CLAUDE.md), with one
-- addition: users.id is a foreign key into auth.users(id) so that
-- auth.uid() (used throughout RLS policies) always matches a row in
-- public.users. A trigger keeps public.users in sync with auth.users on
-- signup.

create extension if not exists pgcrypto;

-- ========== users ==========
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text not null check (role in ('parent','teacher','curator','admin')),
  created_at timestamptz not null default now()
);

-- Keep public.users in sync with auth.users on signup.
-- role defaults to 'parent' and can be changed during onboarding (Phase 1).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'parent'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========== consents (개인정보 동의 이력) ==========
create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('terms_privacy','voice_recording')),
  agreed boolean not null,
  agreed_at timestamptz not null default now()
);

-- ========== children / child_guardians (다대다) ==========
create table children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date,
  profile_image text,
  created_at timestamptz not null default now()
);

create table child_guardians (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','guardian')),
  created_at timestamptz not null default now(),
  unique (child_id, user_id)
);

-- ========== groups ==========
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('kindergarten','school','library','family','community','creator')),
  join_policy text not null check (join_policy in ('approval','open')),
  owner_id uuid not null references users(id),
  invite_code text unique,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== group_members ==========
-- 🔧 스키마 보완: 계획서의 child_id 단일 컬럼으로는 teacher/curator 본인의
-- 멤버십(RLS 판단 기준)을 표현할 수 없어 user_id를 추가함.
-- role='member'  → child_id 채움 (부모가 자녀를 그룹에 등록)
-- role in ('teacher','admin','curator') → user_id 채움 (운영자 본인)
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null check (role in ('member','teacher','admin','curator')),
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references users(id),
  joined_at timestamptz,
  check (child_id is not null or user_id is not null)
);

-- ========== books / book_isbns ==========
create table books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  author text,
  illustrator text,
  publisher text,
  publish_date date,
  page_count int,
  cover_url text,
  introduction text,
  summary text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table book_isbns (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  isbn text not null unique,
  edition text
);
-- 등록 로직: ISBN 스캔 → book_isbns UNIQUE 조회 → 있으면 재사용 / 없으면 신규 생성

-- ========== book_lists / book_list_items ==========
create table book_lists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  description text,
  target_age int,
  created_at timestamptz not null default now()
);

create table book_list_items (
  id uuid primary key default gen_random_uuid(),
  book_list_id uuid not null references book_lists(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  sort_order int,
  required boolean not null default false
);

-- ========== reading_records ==========
-- assignment_id 컬럼 없음: 숙제 완료 여부는 아래 뷰로 계산 (다대다 문제 해결)
create table reading_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  book_id uuid not null references books(id),
  group_id uuid references groups(id),
  read_date date not null default current_date,
  rating int check (rating between 1 and 5),
  emotion text,
  favorite boolean not null default false,
  transcript text,
  voice_url text,
  photo_url text,
  parent_memo text,
  sync_status text not null default 'synced' check (sync_status in ('pending_sync','synced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== assignments (학급형 그룹 전용) ==========
create table assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  title text not null,
  description text,
  start_date date,
  end_date date,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table assignment_books (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  book_id uuid not null references books(id),
  required boolean not null default true
);

create table assignment_missions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  type text not null check (type in ('read','question','voice','drawing','photo')),
  question text,
  required boolean not null default true
);
-- MVP는 type in ('read','question','voice')까지만 UI 구현

-- ========== 숙제 완료 여부 뷰 ==========
create view assignment_completion
with (security_invoker = true) as
select
  am.id as assignment_id,
  ab.book_id,
  gm.child_id,
  exists (
    select 1 from reading_records rr
    where rr.child_id = gm.child_id and rr.book_id = ab.book_id
  ) as completed
from assignment_books ab
join assignments am on am.id = ab.assignment_id
join group_members gm on gm.group_id = am.group_id
  and gm.status = 'approved' and gm.child_id is not null;
