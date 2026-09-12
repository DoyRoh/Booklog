-- 그룹 숲지기 얼굴(곰/백로) 복사본. users.operator_avatar와 같은 패턴으로
-- operator_name을 그룹에 복사해 두었던 것(0024)과 동일한 이유 -- 우리 숲의
-- 숲지기 캐릭터(곰·백로)를 그룹마다 실제로 고른 얼굴로 보여주려면, 아이·
-- 부모 계정이 다른 사람의 users 행을 못 읽으므로 그룹 쪽에 복사본이 필요.
--   users.operator_avatar  -- 이 계정의 숲지기 얼굴(원본, 본인만 읽음, 0019)
--   groups.operator_avatar -- 같은 값을 그룹에 복사. 얼굴을 바꾸면 앱이
--                             자기 그룹 전부를 함께 갱신한다(기존
--                             "owners update own groups" 정책으로 충분).
alter table public.groups add column if not exists operator_avatar text check (operator_avatar in ('bear', 'egret'));

update public.groups g
set operator_avatar = u.operator_avatar
from public.users u
where u.id = g.owner_id and g.operator_avatar is null and u.operator_avatar is not null;
