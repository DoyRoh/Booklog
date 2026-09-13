-- 샘플 데이터: sangwkk@naver.com을 "하바 7세반" 교사 계정으로 만들고,
-- 백희나 작가의 '알사탕' · '이상한 손님'을 그 반의 추천도서로 등록한다.
--
-- ⚠️ 먼저 앱(/signup)에서 sangwkk@naver.com으로 회원가입을 한 번 마쳐야
-- 합니다(온보딩 화면까지 갈 필요는 없음 -- 이 스크립트가 role/그룹을
-- 대신 세팅합니다). 그다음 이 파일 전체를 Supabase SQL Editor에
-- 붙여넣고 실행하세요. 마이그레이션 0013(book_categories)도 먼저
-- 적용되어 있어야 합니다.

do $$
declare
  v_user_id uuid;
  v_group_id uuid;
  v_list_id uuid;
  v_book1_id uuid;
  v_book2_id uuid;
begin
  select id into v_user_id from auth.users where email = 'sangwkk@naver.com';
  if v_user_id is null then
    raise exception 'sangwkk@naver.com 계정을 먼저 앱(/signup)에서 회원가입해 주세요.';
  end if;

  update public.users
    set role = 'teacher', onboarding_completed = true
    where id = v_user_id;

  v_group_id := gen_random_uuid();
  insert into public.groups (id, name, type, join_policy, owner_id, verified)
    values (v_group_id, '하바 7세반', 'kindergarten', 'approval', v_user_id, true);

  insert into public.group_members (group_id, user_id, role, status, approved_at, approved_by, joined_at)
    values (v_group_id, v_user_id, 'teacher', 'approved', now(), v_user_id, now());

  v_list_id := gen_random_uuid();
  insert into public.book_lists (id, group_id, name)
    values (v_list_id, v_group_id, '추천도서');

  v_book1_id := gen_random_uuid();
  insert into public.books (id, title, author, source)
    values (v_book1_id, '알사탕', '백희나', 'manual');
  insert into public.book_categories (book_id, category) values (v_book1_id, '창작');
  insert into public.book_list_items (book_list_id, book_id, required)
    values (v_list_id, v_book1_id, true);

  v_book2_id := gen_random_uuid();
  insert into public.books (id, title, author, source)
    values (v_book2_id, '이상한 손님', '백희나', 'manual');
  insert into public.book_categories (book_id, category) values (v_book2_id, '창작');
  insert into public.book_list_items (book_list_id, book_id, required)
    values (v_list_id, v_book2_id, false);

  raise notice '완료 -- group_id=%, book_list_id=%', v_group_id, v_list_id;
end $$;
