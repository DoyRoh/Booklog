-- 숲길/숙제 탭이 지금 보고 있는 아이의 "현재 그룹"을 공유하도록 -- 부모
-- 쪽 users.active_child_id, 숲지기 쪽 users.active_operator_group_id와
-- 같은 패턴이지만, 그룹 소속은 아이 단위(child_guardians가 아니라
-- group_members.child_id)라 children 테이블에 둔다.
alter table children
  add column if not exists active_group_id uuid references groups(id) on delete set null;

drop policy if exists "guardians update own children" on children;

create policy "guardians update own children"
on children for update
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = children.id and cg.user_id = auth.uid()
))
with check (
  exists (
    select 1 from child_guardians cg
    where cg.child_id = children.id and cg.user_id = auth.uid()
  )
  and (
    active_group_id is null
    or exists (
      select 1 from group_members gm
      where gm.group_id = active_group_id
        and gm.child_id = children.id
        and gm.status = 'approved'
    )
  )
);
