-- 숲지기 이름. 아이·부모는 결국 "누가 추천하는지"(인플루언서·선생님·도서관
-- 이름)를 보고 따라 읽으므로, 그룹 이름과 별개로 운영하는 사람의 이름이
-- 필요하다.
--   users.operator_name  -- 이 계정의 숲지기 프로필 이름(원본, 본인만 읽음)
--   groups.operator_name -- 같은 값을 그룹에 복사해 둔 것. users 행은 RLS상
--                           본인만 읽을 수 있어서, 다른 사람이 그룹 목록·상세
--                           에서 숲지기 이름을 보려면 그룹 쪽에 있어야 한다.
--                           이름을 바꾸면 앱이 자기 그룹 전부를 함께 갱신한다
--                           (기존 "owners update own groups" 정책으로 충분).
alter table public.users add column if not exists operator_name text;
alter table public.groups add column if not exists operator_name text;

update public.groups g
set operator_name = u.operator_name
from public.users u
where u.id = g.owner_id and g.operator_name is null and u.operator_name is not null;
