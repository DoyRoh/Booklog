-- 심사·녹화용 샘플 숲지기 2명 + 공개 그룹 2개 + 다른 사용자가 보탠 질문 1개.
--
-- 왜 필요한가: 신고·차단 버튼은 "다른 사람이 만든 그룹"에만 뜨고, 질문 신고는
-- "다른 사용자가 보탠 질문"에만 뜬다. 데모 계정(심사관)·녹화 계정이 그 장면을
-- 보려면 남의 공개 그룹과 남의 질문이 하나씩은 있어야 한다.
--
-- 순서
--   1) Supabase 대시보드 → Authentication → Users → Add user → Create new user 로
--      아래 두 계정을 만든다. "Auto Confirm User"를 꼭 체크(확인 메일 없이 바로 사용 —
--      기본 메일 발송은 시간당 몇 통 제한이 있어 여러 개 가입하면 막힌다).
--        byul890808+keeper1@gmail.com
--        byul890808+keeper2@gmail.com
--      (Gmail은 +뒤를 무시해서 메일이 전부 byul890808@gmail.com으로 온다.)
--   2) 이 파일 전체를 SQL Editor에 붙여 넣고 실행. 여러 번 실행해도 중복으로 안 생긴다.
--   마이그레이션 0001~0031이 먼저 적용돼 있어야 한다.

do $$
declare
  k record;
  b record;
  v_user uuid;
  v_group uuid;
  v_list uuid;
  v_book uuid;
begin
  for k in
    select * from (values
      ('byul890808+keeper1@gmail.com', '숲속도서관 사서', 'egret', '숲속 그림책 도서관', 'library',
       '도서관 사서가 매달 고른 그림책이에요. 처음 그림책을 만나는 아이부터 혼자 읽기 시작한 아이까지.'),
      ('byul890808+keeper2@gmail.com', '곰아빠', 'bear', '잠자리 그림책 — 곰아빠의 책장', 'creator',
       '두 아이 아빠가 매일 밤 읽어 주며 반응이 좋았던 책만 모았어요.')
    ) as t(email, op_name, avatar, group_name, group_type, description)
  loop
    select id into v_user from auth.users where email = k.email;
    if v_user is null then
      raise exception '% 계정이 없어요. 대시보드 Authentication → Add user로 먼저 만들어 주세요.', k.email;
    end if;

    update public.users
       set onboarding_completed = true,
           active_profile_type = 'operator',
           operator_name = k.op_name,
           operator_avatar = k.avatar
     where id = v_user;

    select id into v_group from public.groups where owner_id = v_user and name = k.group_name;
    if v_group is null then
      v_group := gen_random_uuid();
      insert into public.groups (id, name, type, join_policy, owner_id, description, operator_name, operator_avatar)
        values (v_group, k.group_name, k.group_type, 'open', v_user, k.description, k.op_name, k.avatar);
      insert into public.group_members (group_id, user_id, role, status, approved_at, approved_by, joined_at)
        values (v_group, v_user, 'teacher', 'approved', now(), v_user, now());
    end if;

    select id into v_list from public.book_lists where group_id = v_group order by created_at limit 1;
    if v_list is null then
      v_list := gen_random_uuid();
      insert into public.book_lists (id, group_id, name) values (v_list, v_group, '추천도서');
    end if;

    for b in
      select * from (values
        ('byul890808+keeper1@gmail.com', '구름빵', '백희나', '창작'),
        ('byul890808+keeper1@gmail.com', '강아지똥', '권정생', '인성'),
        ('byul890808+keeper1@gmail.com', '수박 수영장', '안녕달', '창작'),
        ('byul890808+keeper1@gmail.com', '배고픈 애벌레', '에릭 칼', '과학'),
        ('byul890808+keeper1@gmail.com', '괴물들이 사는 나라', '모리스 샌닥', '명작'),
        ('byul890808+keeper1@gmail.com', '100층짜리 집', '이와이 도시오', '수학'),
        ('byul890808+keeper2@gmail.com', '장수탕 선녀님', '백희나', '창작'),
        ('byul890808+keeper2@gmail.com', '무지개 물고기', '마르쿠스 피스터', '인성'),
        ('byul890808+keeper2@gmail.com', '줄무늬가 생겼어요', '데이빗 섀논', '인성'),
        ('byul890808+keeper2@gmail.com', '알사탕', '백희나', '창작')
      ) as t(email, title, author, category)
      where t.email = k.email
    loop
      select id into v_book from public.books where title = b.title and author = b.author order by created_at limit 1;
      if v_book is null then
        v_book := gen_random_uuid();
        insert into public.books (id, title, author, source) values (v_book, b.title, b.author, 'manual');
      end if;
      insert into public.book_categories (book_id, category) values (v_book, b.category)
        on conflict do nothing;
      insert into public.book_list_items (book_list_id, book_id, required) values (v_list, v_book, false)
        on conflict (book_list_id, book_id) do nothing;
    end loop;

    -- 질문 신고 장면용: 숲지기1이 공용 질문 은행에 질문 하나를 보탠다.
    if k.email = 'byul890808+keeper1@gmail.com'
       and not exists (select 1 from public.book_questions where created_by = v_user) then
      insert into public.book_questions (text, created_by)
        values ('이 책에서 제일 용감했던 친구는 누구였어?', v_user);
    end if;
  end loop;

  raise notice '완료 -- 숲지기 2명, 공개 그룹 2개 준비됨';
end $$;
