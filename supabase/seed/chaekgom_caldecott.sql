-- 책곰 숲지기의 "칼데콧 수상작" 그룹에 칼데콧 메달·아너상 그림책 20권 넣기 (사용자 요청)
--
-- Supabase SQL Editor에서 한 번 실행. 여러 번 실행해도 중복으로 들어가지 않는다.
--   * 숲지기 이름이 "책곰"인 계정(0031로 숲지기 이름은 유일)을 찾는다.
--   * 그 계정이 만든 그룹 중 이름이 "칼데콧"으로 시작하는 그룹이 있으면 그걸 쓰고,
--     없으면 공개(open) 크리에이터 그룹 "칼데콧 수상작"을 새로 만든다.
--   * 그룹 소개를 아래 문장으로 바꾼다.
--   * 책은 같은 제목(띄어쓰기 무시)이 카탈로그에 있으면 재사용, 없으면 제목·작가만으로
--     만든다(source='curated' → 프로필·설정 → 운영 도구 "공식 숲지기 책 표지 채우기"로 표지가 붙음).
--   * 추천 연령(0038)·설명(0039) 컬럼이 있으면 채운다 — 숲지기가 이미 고친 값은 덮어쓰지 않는다.

do $$
declare
  v_user uuid;
  v_group uuid;
  v_list uuid;
  v_book uuid;
  v_has_age boolean;
  v_has_note boolean;
  v_desc constant text :=
    '미국에서 한 해 가장 뛰어난 그림책에 주는 칼데콧상 수상작을 모았어요. 메달(대상)과 아너상(우수상)을 받은 책들이고, 책마다 받은 해와 추천 나이를 적어 두었어요.';
  b record;
begin
  select id into v_user from public.users where btrim(operator_name) = '책곰' limit 1;
  if v_user is null then
    raise exception '숲지기 이름이 "책곰"인 계정이 없어요. 프로필·설정에서 숲지기 이름을 먼저 확인해 주세요.';
  end if;

  select g.id into v_group
  from public.groups g
  where g.owner_id = v_user and (g.name like '칼데콧%' or g.name like '칼데곳%')
  order by g.created_at
  limit 1;

  if v_group is null then
    v_group := gen_random_uuid();
    insert into public.groups (id, name, type, join_policy, owner_id, invite_code, description, operator_name, operator_avatar)
      select v_group, '칼데콧 수상작', 'creator', 'open', v_user,
             upper(substr(md5(random()::text), 1, 6)), v_desc, u.operator_name, u.operator_avatar
      from public.users u where u.id = v_user;
    insert into public.group_members (group_id, user_id, role, status, approved_at)
      values (v_group, v_user, 'teacher', 'approved', now());
  else
    update public.groups set description = v_desc where id = v_group;
  end if;

  select id into v_list from public.book_lists where group_id = v_group order by created_at limit 1;
  if v_list is null then
    v_list := gen_random_uuid();
    insert into public.book_lists (id, group_id, name) values (v_list, v_group, '추천도서');
  end if;

  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'book_list_items' and column_name = 'age_bands')
    into v_has_age;
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'book_list_items' and column_name = 'note')
    into v_has_note;

  for b in
    select * from (values
      -- 아너상
      ( 1, '샘과 데이브가 땅을 파요', '맥 바넷 글 · 존 클라센 그림', array['preschool'], '칼데콧 아너상 (2015)'),
      ( 2, '애너벨과 신기한 털실', '맥 바넷 글 · 존 클라센 그림', array['preschool'], '칼데콧 아너상 (2013)'),
      ( 3, '비둘기에게 버스 운전은 맡기지 마세요!', '모 윌렘스', array['preschool'], '칼데콧 아너상 (2004)'),
      ( 4, '내 토끼 어딨어?', '모 윌렘스', array['preschool'], '칼데콧 아너상 (2005)'),
      ( 5, '내 사랑 뿌뿌', '케빈 헹크스', array['preschool'], '칼데콧 아너상 (1994)'),
      ( 6, '엄마의 의자', '베라 B. 윌리엄스', array['preschool','lower'], '칼데콧 아너상 (1983)'),
      ( 7, '으뜸 헤엄이', '레오 리오니', array['preschool'], '칼데콧 아너상 (1961)'),
      ( 8, '알렉산더와 장난감 쥐', '레오 리오니', array['preschool'], '칼데콧 아너상 (1970)'),
      ( 9, '깊은 밤 부엌에서', '모리스 샌닥', array['preschool'], '칼데콧 아너상 (1971)'),
      (10, '마들린느', '루드비히 베멀먼즈', array['preschool'], '칼데콧 아너상 (1940)'),
      (11, '머나먼 여행', '에런 베커', array['preschool','lower'], '칼데콧 아너상 (2014) · 글 없는 그림책'),
      (12, '행복을 나르는 버스', '맷 데 라 페냐 글 · 크리스티안 로빈슨 그림', array['preschool','lower'], '칼데콧 아너상 (2016) · 뉴베리 메달'),
      -- 메달
      (13, '이건 내 모자가 아니야', '존 클라센', array['preschool'], '칼데콧 메달 (2013) · 케이트 그리너웨이상'),
      (14, '이상한 화요일', '데이비드 위즈너', array['preschool','lower'], '칼데콧 메달 (1992)'),
      (15, '당나귀 실베스터와 요술 조약돌', '윌리엄 스타이그', array['preschool','lower'], '칼데콧 메달 (1970)'),
      (16, '달구지를 끌고', '도널드 홀 글 · 바버러 쿠니 그림', array['preschool','lower'], '칼데콧 메달 (1980)'),
      (17, '할아버지의 긴 여행', '앨런 세이', array['preschool','lower'], '칼데콧 메달 (1994)'),
      (18, '늑대 할머니', '에드 영', array['preschool','lower'], '칼데콧 메달 (1990)'),
      (19, '쥬만지', '크리스 반 알스버그', array['preschool','lower'], '칼데콧 메달 (1982)'),
      (20, '빛나는 아이', '자바카 스텝토', array['lower'], '칼데콧 메달 (2017)')
    ) as t(ord, title, author, bands, note)
    order by ord
  loop
    select id into v_book from public.books
    where regexp_replace(title, '\s', '', 'g') = regexp_replace(b.title, '\s', '', 'g')
    order by (cover_url is null), created_at
    limit 1;
    if v_book is null then
      v_book := gen_random_uuid();
      insert into public.books (id, title, author, source) values (v_book, b.title, b.author, 'curated');
    end if;

    -- 순서대로 보이도록 올린 시각을 1초씩 벌린다(목록은 최근 올린 순이라 1번이 맨 위).
    insert into public.book_list_items (book_list_id, book_id, required, created_at)
      values (v_list, v_book, false, now() - make_interval(secs => b.ord))
      on conflict (book_list_id, book_id) do nothing;

    if v_has_age then
      execute 'update public.book_list_items set age_bands = $1
               where book_list_id = $2 and book_id = $3 and age_bands is null'
        using b.bands, v_list, v_book;
    end if;
    if v_has_note then
      execute 'update public.book_list_items set note = $1
               where book_list_id = $2 and book_id = $3 and note is null'
        using b.note, v_list, v_book;
    end if;
  end loop;

  raise notice '완료 -- 그룹 %, 목록 %', v_group, v_list;
end $$;
