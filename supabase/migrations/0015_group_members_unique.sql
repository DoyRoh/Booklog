-- 그룹 팔로우/가입 버튼을 빠르게 연타하면(react state가 disabled로
-- 반영되기 전에 두 번째 클릭이 들어가는, library/add 저장 버튼에서
-- 이미 한 번 겪었던 것과 같은 경쟁 상태) 같은 아이가 같은 그룹에 여러 번
-- group_members 행을 갖게 될 수 있었다. group_members.decide()(승인/거절)는
-- 항상 기존 행을 update하지 새 행을 insert하지 않으므로, 한 그룹에 대해
-- child_id 또는 user_id 조합이 두 번 이상 있을 이유가 없다.

-- 기존 중복 제거: 그룹+아이(child_id), 그룹+운영진(user_id) 조합별로
-- approved를 우선하고(그다음 가장 먼저 신청한 순) 하나만 남긴다.
delete from group_members gm
using (
  select id,
    row_number() over (
      partition by group_id, child_id
      order by (status = 'approved') desc, requested_at asc, id asc
    ) as rn
  from group_members
  where child_id is not null
) ranked
where gm.id = ranked.id and ranked.rn > 1;

delete from group_members gm
using (
  select id,
    row_number() over (
      partition by group_id, user_id
      order by (status = 'approved') desc, requested_at asc, id asc
    ) as rn
  from group_members
  where user_id is not null
) ranked
where gm.id = ranked.id and ranked.rn > 1;

create unique index group_members_group_child_unique
  on group_members (group_id, child_id)
  where child_id is not null;

create unique index group_members_group_user_unique
  on group_members (group_id, user_id)
  where user_id is not null;
