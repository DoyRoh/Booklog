-- 책숲 Phase 4 — 그룹 + 추천도서
-- 초대 코드로 승인제(approval) 그룹을 찾는 함수. 승인 전엔 groups의 일반
-- SELECT 정책으로는 그 그룹이 안 보이므로("approval groups visible to
-- approved members"), 코드를 아는 사람만 최소 정보(이름/유형)를 확인할
-- 수 있도록 RLS를 우회하는 함수로 제공한다. group_join_policy()와 같은
-- 이유의 패턴이다.
create function public.find_group_by_invite_code(p_code text)
returns table (id uuid, name text, type text, join_policy text)
language sql
security definer
set search_path = public
stable
as $$
  select id, name, type, join_policy
  from groups
  where invite_code = p_code;
$$;
