-- 국립어린이청소년도서관 "사서추천도서" Open API를 자동으로 큐레이터
-- 추천도서로 반영하기 위한 시스템 계정/그룹 세팅.
--
-- ⚠️ 먼저 앱(/signup)에서 아래 이메일로 회원가입을 한 번 마쳐야 합니다.
-- 이 계정은 실제 사람이 로그인하는 계정이 아니라, lib/nlcy-sync.ts가
-- Vercel Cron 또는 "지금 동기화" 버튼에서 서버 쪽에서만 로그인해 쓰는
-- 서비스 계정입니다 (서비스 롤 키 없이 RLS를 통과하기 위한 방법).
-- 비밀번호는 이 회원가입 때 정한 값을 그대로 Vercel 환경변수
-- NLCY_CURATOR_PASSWORD에 넣어야 합니다. 이메일도 NLCY_CURATOR_EMAIL과
-- 반드시 일치해야 합니다. 그 다음 이 파일 전체를 Supabase SQL Editor에
-- 붙여넣고 실행하세요. 마이그레이션 0014까지 먼저 적용되어 있어야 합니다.

do $$
declare
  v_curator_email text := 'nlcy-curator@example.com'; -- NLCY_CURATOR_EMAIL과 동일한 값으로 바꿔서 실행하세요
  v_user_id uuid;
  v_group_id uuid;
  v_list_id uuid;
begin
  select id into v_user_id from auth.users where email = v_curator_email;
  if v_user_id is null then
    raise exception '% 계정을 먼저 앱(/signup)에서 회원가입해 주세요.', v_curator_email;
  end if;

  update public.users
    set role = 'curator', onboarding_completed = true
    where id = v_user_id;

  v_group_id := gen_random_uuid();
  insert into public.groups (id, name, type, join_policy, owner_id, verified)
    values (v_group_id, '국립어린이청소년도서관', 'library', 'open', v_user_id, true);

  insert into public.group_members (group_id, user_id, role, status, approved_at, approved_by, joined_at)
    values (v_group_id, v_user_id, 'curator', 'approved', now(), v_user_id, now());

  v_list_id := gen_random_uuid();
  insert into public.book_lists (id, group_id, name, description)
    values (v_list_id, v_group_id, '사서추천도서', '국립어린이청소년도서관 사서추천도서 Open API에서 자동으로 채워지는 목록이에요.');

  raise notice '완료 -- group_id=%, book_list_id=% (이제 /api/curators/nlcy/sync-now 또는 Vercel Cron으로 채워집니다)', v_group_id, v_list_id;
end $$;
