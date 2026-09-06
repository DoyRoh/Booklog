-- 계정 하나가 아이 프로필(부모)과 선생님/기관 프로필(그룹 운영진)을 동시에
-- 가질 수 있게 한다. users.role은 더 이상 화면을 가르는 절대 기준이 아니라
-- 온보딩에서 고른 최초 기본값일 뿐이고, 실제로 어느 화면을 보여줄지는 이
-- 컬럼(active_profile_type)으로 정한다. 어떤 그룹의 운영진인지는 이미
-- group_members가 진실의 원천이라 따로 저장하지 않고 그때그때 조회한다
-- (lib/active-profile.ts).
alter table users
  add column active_profile_type text not null default 'child'
    check (active_profile_type in ('child', 'operator'));
