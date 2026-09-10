-- 그룹 소개글. 아이·부모가 그룹을 팔로우하기 전에 "어떤 그룹인지" 읽어볼
-- 자리가 없어서 추가한다. 숲지기(owner)가 그룹 상세에서 적고 고친다 --
-- 기존 "owners update own groups" 정책이 그대로 UPDATE를 허용한다.
alter table public.groups add column if not exists description text;
