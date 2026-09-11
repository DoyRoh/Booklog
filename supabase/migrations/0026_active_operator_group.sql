-- 숲지기가 그룹을 여러 개 운영할 때 "지금 보고 있는 그룹"을 하나 기억한다
-- (부모 쪽 active_child_id와 같은 패턴). 예전엔 아이들/추천도서/숙제 세
-- 탭이 각자 URL 쿼리(?group=)로만 그룹을 골라서, 한 탭에서 그룹을 바꿔도
-- 다른 탭으로 넘어가면 첫 그룹으로 되돌아갔다 -- "매 메뉴마다 그룹을 다시
-- 골라야 해서 귀찮다"는 지적을 반영해, 세 탭이 이 값 하나를 공유해서
-- 어디서 바꾸든 다른 탭에도 그대로 이어지게 한다.
alter table users
  add column active_operator_group_id uuid references groups(id) on delete set null;

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
  and (
    active_operator_group_id is null
    or exists (
      select 1 from group_members gm
      where gm.group_id = active_operator_group_id
        and gm.user_id = auth.uid()
        and gm.status = 'approved'
        and gm.role in ('teacher', 'admin', 'curator')
    )
  )
);
