-- Phase 5: 독서숙제(assignments)의 'question'/'voice' 미션에 대한 아이의
-- 답변을 저장할 곳이 스키마에 없었다(assignment_completion 뷰는 책을
-- 읽었는지만 book 단위로 판정). 'read' 미션은 reading_records 존재 여부로
-- 이미 판정 가능하므로 그대로 두고, 'question'/'voice' 미션 답변만 이
-- 테이블에 남긴다. voice_url은 Storage 버킷이 아직 없어 지금은 앱에서
-- 쓰지 않지만(텍스트 답변만 지원), 나중에 붙일 자리로 미리 만들어 둔다.
create table assignment_mission_responses (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references assignment_missions(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  answer_text text,
  voice_url text,
  completed_at timestamptz not null default now(),
  unique (mission_id, child_id)
);

alter table assignment_mission_responses enable row level security;

-- reading_records와 동일한 원칙: 보호자는 자기 아이의 답변을 전체 CRUD.
create policy "guardians manage own child's mission responses"
on assignment_mission_responses for all
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = assignment_mission_responses.child_id and cg.user_id = auth.uid()
))
with check (exists (
  select 1 from child_guardians cg
  where cg.child_id = assignment_mission_responses.child_id and cg.user_id = auth.uid()
));

-- teacher_reading_view와 동일한 원칙: 교사는 자기 그룹 소속 아이의 답변을
-- 조회만 가능(수정 불가).
create policy "teachers view group mission responses"
on assignment_mission_responses for select
using (exists (
  select 1 from assignment_missions am
  join assignments a on a.id = am.assignment_id
  join group_members gm on gm.group_id = a.group_id
  where am.id = assignment_mission_responses.mission_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher', 'admin')
    and gm.status = 'approved'
));
