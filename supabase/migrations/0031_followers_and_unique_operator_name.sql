-- 1) 공개 그룹의 팔로워 수.
--    group_members는 RLS상 그 그룹 운영진과 자기 아이의 행만 보이므로,
--    둘러보는 부모는 다른 그룹의 팔로워 수를 셀 수 없다. 숫자만 돌려주는
--    SECURITY DEFINER 함수로 연다 -- 누가 따르는지는 드러나지 않고,
--    공개(open) 그룹만 대상이다(승인제 학급 그룹은 인원수도 비공개).
create or replace function public.group_follower_counts(p_group_ids uuid[])
returns table (group_id uuid, followers int)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, count(gm.id)::int
  from groups g
  left join group_members gm
    on gm.group_id = g.id
   and gm.child_id is not null
   and gm.status = 'approved'
  where g.id = any(p_group_ids)
    and g.join_policy = 'open'
  group by g.id;
$$;

revoke all on function public.group_follower_counts(uuid[]) from public;
grant execute on function public.group_follower_counts(uuid[]) to authenticated;

-- 2) 숲지기 이름은 서비스 전체에서 하나만.
--    부모는 이름을 보고 따를 숲지기를 고르므로 같은 이름이 둘이면 헷갈리고
--    사칭도 쉬워진다. 앞뒤 공백·대소문자를 무시하고 비교한다.
--    이미 겹친 이름이 있으면 나중에 가입한 쪽에 " 2", " 3"을 붙여 먼저 정리한다
--    (그 사람의 그룹에 복사된 이름도 같이 맞춘다).
with ranked as (
  select id,
         btrim(operator_name) as base,
         row_number() over (
           partition by lower(btrim(operator_name))
           order by created_at, id
         ) as rn
  from users
  where operator_name is not null and btrim(operator_name) <> ''
)
update users u
set operator_name = r.base || ' ' || r.rn
from ranked r
where u.id = r.id and r.rn > 1;

update groups g
set operator_name = u.operator_name
from users u
where g.owner_id = u.id
  and u.operator_name is not null
  and g.operator_name is distinct from u.operator_name;

create unique index if not exists users_operator_name_unique
  on users (lower(btrim(operator_name)))
  where operator_name is not null and btrim(operator_name) <> '';
