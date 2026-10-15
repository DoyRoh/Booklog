-- 국립어린이청소년도서관 숲지기 1명 + 공개 그룹 5개(유아/초등 저학년/초등 고학년/청소년/테마).
--
-- 왜: 예전 Open API 연동은 분류 없이 한 목록에 다 쏟아져서 쓸모가 없었다.
-- 도서관 누리집의 "사서추천도서"는 분류 탭으로 나뉘어 있어서, 분류마다 그룹을
-- 따로 두고 운영 도구가 2025·2026년 목록만 분류별로 가져와 채운다.
--
-- 순서
--   1) 대시보드 → Authentication → Users → Add user, "Auto Confirm User" 체크.
--        byul890808+nlcy@gmail.com   (비밀번호는 아무거나, 로그인할 일 없음)
--   2) 마이그레이션 0036을 먼저 실행한 뒤 이 파일 전체를 SQL Editor에서 실행.
--      여러 번 실행해도 중복으로 안 생긴다.
--   3) 운영자 계정으로 앱 → 프로필·설정 → 운영 도구 → "사서추천도서 가져오기"에서
--      분류마다 "가져오기"를 누른 뒤, "공식 숲지기 책 표지 채우기"는 필요 없음
--      (가져올 때 카카오 검색으로 표지를 같이 채운다).
-- 그룹 이름은 lib/nlcy-scrape.ts의 NLCY_CATEGORIES와 같아야 한다.

do $$
declare
  g record;
  v_user uuid;
  v_group uuid;
begin
  select id into v_user from auth.users where email = 'byul890808+nlcy@gmail.com';
  if v_user is null then
    raise exception 'byul890808+nlcy@gmail.com 계정이 없어요. 대시보드 Authentication → Add user로 먼저 만들어 주세요.';
  end if;

  update public.users
     set onboarding_completed = true, active_profile_type = 'operator',
         operator_name = '국립어린이청소년도서관', operator_avatar = 'egret'
   where id = v_user;

  for g in
    select * from (values
      ('사서추천도서 · 유아',
       '국립어린이청소년도서관 사서들이 고른 유아 그림책이에요. 2025·2026년 추천도서를 모았어요.'),
      ('사서추천도서 · 초등 저학년',
       '국립어린이청소년도서관 사서들이 고른 초등 1~3학년 책이에요. 2025·2026년 추천도서를 모았어요.'),
      ('사서추천도서 · 초등 고학년',
       '국립어린이청소년도서관 사서들이 고른 초등 4~6학년 책이에요. 2025·2026년 추천도서를 모았어요.'),
      ('사서추천도서 · 청소년',
       '국립어린이청소년도서관 사서들이 고른 청소년 책이에요. 2025·2026년 추천도서를 모았어요.'),
      ('사서추천도서 · 테마',
       '국립어린이청소년도서관 사서들이 주제를 정해 고른 책이에요. 2025·2026년 추천도서를 모았어요.')
    ) as t(name, description)
  loop
    select id into v_group from public.groups where owner_id = v_user and name = g.name;
    if v_group is null then
      v_group := gen_random_uuid();
      insert into public.groups (id, name, type, join_policy, owner_id, description, verified, operator_name, operator_avatar)
        values (v_group, g.name, 'library', 'open', v_user, g.description, true, '국립어린이청소년도서관', 'egret');
      insert into public.group_members (group_id, user_id, role, status, approved_at, approved_by, joined_at)
        values (v_group, v_user, 'teacher', 'approved', now(), v_user, now());
    else
      update public.groups set description = g.description, verified = true where id = v_group;
    end if;
    if not exists (select 1 from public.book_lists where group_id = v_group) then
      insert into public.book_lists (group_id, name) values (v_group, '추천도서');
    end if;
  end loop;

  raise notice '완료 -- 국립어린이청소년도서관 그룹 5개. 앱 운영 도구에서 분류별로 가져오기를 눌러 주세요.';
end $$;
