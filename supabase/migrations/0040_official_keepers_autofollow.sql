-- 책숲 공식 숲지기: (1) "공식"(groups.verified)은 운영자만 켜고 끌 수 있게,
-- (2) 책곰(운영자 계정 byul890808@gmail.com의 숲지기)의 칼데콧 그룹을 공식으로,
-- (3) 새로 등록하는 아이는 공식 공개 그룹을 기본으로 팔로우.

-- (1) 지금까지는 "owners update own groups" 정책 때문에 그룹장이면 누구나
-- verified를 스스로 켤 수 있었다. 운영자가 아니면 바꾸려 해도 조용히 원래 값으로
-- 되돌린다(오류를 내면 그룹 고치기 화면이 통째로 실패하므로). SQL Editor처럼
-- 로그인 사용자가 없는 실행(auth.uid() is null)은 운영자로 본다.
create or replace function public.guard_group_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  v_admin := auth.uid() is null or exists (
    select 1 from auth.users u
    where u.id = auth.uid() and lower(u.email) = 'byul890808@gmail.com'
  );
  if v_admin then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified := false;
  elsif new.verified is distinct from old.verified then
    new.verified := old.verified;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_guard_verified on public.groups;
create trigger groups_guard_verified
before insert or update on public.groups
for each row execute function public.guard_group_verified();

-- (2) 운영자 계정이 만든 칼데콧 그룹을 책숲 공식으로(공개 그룹이어야 둘러보기·자동 팔로우 대상).
update public.groups g
set verified = true, join_policy = 'open'
where g.owner_id = (select u.id from auth.users u where lower(u.email) = 'byul890808@gmail.com')
  and g.name like '%칼데콧%';

-- (3) 아이를 처음 등록할 때(첫 보호자 연결이 생길 때) 공식 공개 그룹을 팔로우해 둔다.
-- 원하면 그룹 화면에서 끊을 수 있다. 이미 있는 아이는 건드리지 않는다.
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
    and not exists (
      select 1 from public.group_members gm
      where gm.group_id = g.id and gm.child_id = new.child_id
    );
  return new;
exception when others then
  -- 자동 팔로우가 실패해도 아이 등록은 막지 않는다.
  return new;
end;
$$;

drop trigger if exists child_guardians_follow_official on public.child_guardians;
create trigger child_guardians_follow_official
after insert on public.child_guardians
for each row execute function public.follow_official_groups();
