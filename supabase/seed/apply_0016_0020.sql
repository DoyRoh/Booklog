-- 0016~0020 마이그레이션 묶음 -- 몇 번을 실행해도 안전한(멱등) 버전.
-- 이미 적용된 단계는 그냥 건너뛰고, 안 된 단계만 실제로 적용된다.
-- Supabase SQL Editor에 통째로 붙여 넣어 Run.

-- ===== 0016: users.active_profile_type =====
alter table users
  add column if not exists active_profile_type text not null default 'child'
    check (active_profile_type in ('child', 'operator'));

-- ===== 0017: 책장 공유(보호자 초대) + child_guardians RLS 구멍 막기 =====
alter table children add column if not exists invite_code text unique;

drop policy if exists "users manage own guardian links" on child_guardians;
drop policy if exists "users create their own new child link" on child_guardians;
drop policy if exists "users update own guardian link" on child_guardians;
drop policy if exists "users delete own guardian link" on child_guardians;

create policy "users create their own new child link"
on child_guardians for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1 from child_guardians cg2 where cg2.child_id = child_guardians.child_id
  )
);

create policy "users update own guardian link"
on child_guardians for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users delete own guardian link"
on child_guardians for delete
using (user_id = auth.uid());

create or replace function public.join_child_by_invite_code(p_code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_child_name text;
begin
  select c.id, c.name into v_child_id, v_child_name
  from children c
  where c.invite_code = p_code;

  if v_child_id is null then
    raise exception '유효하지 않은 공유 코드예요.';
  end if;

  insert into child_guardians (child_id, user_id, role)
  values (v_child_id, auth.uid(), 'guardian')
  on conflict (child_id, user_id) do nothing;

  return query select v_child_id, v_child_name;
end;
$$;

grant execute on function public.join_child_by_invite_code(text) to authenticated;

-- ===== 0018: 책장 나누기(shelf_tags) =====
create table if not exists shelf_tags (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (child_id, name)
);

alter table reading_records
  add column if not exists shelf_tag_id uuid references shelf_tags(id) on delete set null;

alter table shelf_tags enable row level security;

drop policy if exists "guardians manage shelf tags of own children" on shelf_tags;
create policy "guardians manage shelf tags of own children"
on shelf_tags for all
using (public.is_child_guardian(child_id))
with check (public.is_child_guardian(child_id));

-- ===== 0019: users.operator_avatar =====
alter table users
  add column if not exists operator_avatar text
    check (operator_avatar in ('bear', 'egret'));

-- ===== 0020: curator → teacher 통합 =====
update group_members set role = 'teacher' where role = 'curator';
update users set role = 'teacher' where role = 'curator';
