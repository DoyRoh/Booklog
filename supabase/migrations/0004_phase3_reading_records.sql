-- 책숲 Phase 3 — 독서기록 + 다자녀 지원
-- 1) 여러 아이를 등록한 부모가 "지금 보고 있는 아이"를 고를 수 있도록
--    users.active_child_id 추가.
-- 2) 아무 child_id나 넣지 못하도록, 본인이 실제 보호자인 아이만 지정 가능하게
--    self-update 정책을 강화.

alter table users
  add column active_child_id uuid references children(id) on delete set null;

drop policy "users update own row" on users;

create policy "users update own row"
on users for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role in ('parent', 'teacher', 'curator')
  and (
    active_child_id is null
    or exists (
      select 1 from child_guardians cg
      where cg.child_id = active_child_id and cg.user_id = auth.uid()
    )
  )
);
