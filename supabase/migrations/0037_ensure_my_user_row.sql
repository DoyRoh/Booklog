-- 로그인은 되는데(auth.users 있음) public.users 행이 없는 계정을 되살린다.
--
-- 증상: 비밀번호를 바꾼 계정이 로그인 버튼을 눌러도 반응이 없었다. 로그인은
-- 성공했지만 미들웨어(proxy.ts)가 public.users 행이 없는 걸 "삭제된 계정의
-- 남은 세션"으로 보고 다시 로그아웃시킨 것. 가입 트리거(on_auth_user_created)가
-- 어떤 이유로든 행을 못 만든 계정이 있을 수 있어서, 지금 비어 있는 계정은 한 번
-- 채우고(아래 backfill), 앞으로는 미들웨어가 이 함수로 그 자리에서 채운다.

-- 1) 지금 비어 있는 계정 채우기. 같은 이메일로 남아 있는 고아 행(auth에 없는
--    id)이 있으면 이메일 유니크에 걸리므로 먼저 지운다.
delete from public.users pu
where not exists (select 1 from auth.users au where au.id = pu.id)
  and exists (
    select 1 from auth.users au2
    where lower(au2.email) = lower(pu.email) and au2.id <> pu.id
  );

insert into public.users (id, email, role)
select au.id, au.email, coalesce(au.raw_user_meta_data->>'role', 'parent')
from auth.users au
where au.email is not null
  and not exists (select 1 from public.users pu where pu.id = au.id)
on conflict do nothing;

-- 2) 로그인한 본인 행이 없으면 만들고, 있으면(또는 만들었으면) true.
--    auth.users에도 없으면(정말 삭제된 계정) false — 미들웨어가 로그아웃시킨다.
create or replace function public.ensure_my_user_row()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_role text;
begin
  if v_uid is null then
    return false;
  end if;
  if exists (select 1 from public.users where id = v_uid) then
    return true;
  end if;

  select email, coalesce(raw_user_meta_data->>'role', 'parent')
    into v_email, v_role
  from auth.users where id = v_uid;
  if v_email is null then
    return false;
  end if;

  delete from public.users pu
  where lower(pu.email) = lower(v_email)
    and pu.id <> v_uid
    and not exists (select 1 from auth.users au where au.id = pu.id);

  insert into public.users (id, email, role)
  values (v_uid, v_email, v_role)
  on conflict do nothing;

  return exists (select 1 from public.users where id = v_uid);
end;
$$;

revoke all on function public.ensure_my_user_row() from public;
grant execute on function public.ensure_my_user_row() to authenticated;
