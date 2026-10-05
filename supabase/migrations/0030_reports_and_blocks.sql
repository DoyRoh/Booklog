-- 신고·차단 (Apple 심사 가이드라인 1.2 — 사용자 생성 콘텐츠).
--
-- 책숲에는 채팅·댓글은 없지만, 다른 사용자가 만든 것이 서로에게 보이는
-- 자리가 있다: 공개 그룹(이름·소개·숲지기 이름·추천도서)과 공용 질문
-- 은행(book_questions). Apple은 이런 앱에 (1) 부적절한 콘텐츠를 신고하는
-- 방법, (2) 문제 있는 사용자를 차단하는 방법, (3) 운영자의 빠른 대응을
-- 요구한다.
--
-- content_reports: 신고 접수함. 신고자는 자기 신고만 볼 수 있고(신고한
--   그룹·질문을 즉시 내 화면에서 숨기는 데 씀), 전체 목록은 운영자가
--   Supabase 대시보드(Table Editor)에서 확인해 콘텐츠를 지우거나 계정을
--   정지한다.
-- user_blocks: 차단 목록. 차단한 사용자가 만든 공개 그룹과 질문이 내 화면
--   어디에도 안 보인다.

create table content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references users(id) on delete set null,
  target_type text not null check (target_type in ('group', 'question')),
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

create index content_reports_reporter_idx on content_reports (reporter_id);

alter table content_reports enable row level security;

create policy "users file their own reports"
on content_reports for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "users read their own reports"
on content_reports for select
to authenticated
using (reporter_id = auth.uid());

create table user_blocks (
  blocker_id uuid not null default auth.uid() references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table user_blocks enable row level security;

create policy "users manage their own blocks"
on user_blocks for all
to authenticated
using (blocker_id = auth.uid())
with check (blocker_id = auth.uid());
