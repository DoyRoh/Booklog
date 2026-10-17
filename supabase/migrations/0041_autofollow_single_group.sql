-- 새 아이가 공식 공개 그룹을 전부 자동 팔로우하면 너무 많아서(사용자 지적),
-- 책곰 공식의 "작은 마음에 오래 남는 그림책" 그룹 하나만 기본으로 팔로우한다.
-- 그룹 이름은 앞부분만 맞으면 되도록 like 로 찾는다(공식·공개 그룹만).
create or replace function public.follow_official_groups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'owner' then
    return new;
  end if;
  insert into public.group_members (group_id, child_id, role, status, approved_at)
  select g.id, new.child_id, 'member', 'approved', now()
  from public.groups g
  where g.verified and g.join_policy = 'open'
    and g.name like '작은 마음에 오래 남는 그림책%'
    and not exists (
      select 1 from public.group_members gm
      where gm.group_id = g.id and gm.child_id = new.child_id
    );
  return new;
exception when others then
  return new;
end;
$$;
