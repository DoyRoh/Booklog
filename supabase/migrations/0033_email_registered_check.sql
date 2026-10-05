-- 회원가입 전에 "이미 가입된 이메일인지" 확인한다.
--
-- Supabase는 이미 있는 이메일로 signUp을 불러도 오류 없이 넘어가고(이메일 존재를 숨기려는 기본 동작),
-- 경우에 따라 확인 메일을 다시 보낸다. 그래서 앱은 "가입 확인 메일을 보냈어요"라고 잘못 안내했다.
-- 가입 화면이 signUp 전에 이 함수로 먼저 묻고, 이미 있으면 signUp을 아예 부르지 않는다(메일도 안 감).
--
-- 대가: 누구나 "이 이메일이 가입돼 있는지"를 알 수 있다(이메일 열거). 아이 정보는 전혀 드러나지 않고
-- true/false 하나뿐이라, 중복 가입 혼란을 막는 쪽을 택했다.

create or replace function public.is_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(btrim(p_email))
  );
$$;

revoke all on function public.is_email_registered(text) from public;
grant execute on function public.is_email_registered(text) to anon, authenticated;
