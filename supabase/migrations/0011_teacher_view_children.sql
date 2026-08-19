-- 버그 수정: children 테이블에 교사/운영자용 SELECT 정책이 아예 없었다.
-- "guardians select own children" 하나뿐이라, 교사가 group_members(children(name))
-- 처럼 임베드로 아이 이름을 조회하면 PostgREST가 children 자체의 RLS도
-- 별도로 검사하기 때문에 조용히 null/빈 값으로 돌아왔다 -- 승인 대기 목록에
-- 아이 이름이 안 뜨는 원인이었다. 아이가 pending이든 approved든, 그 그룹의
-- 운영진(교사/관리자)이면 이름을 볼 수 있어야 승인 여부를 판단할 수 있다.
create policy "operators view children in their groups"
on children for select
using (exists (
  select 1 from group_members gm
  where gm.child_id = children.id
    and public.has_group_role(gm.group_id, array['teacher', 'admin'])
));
