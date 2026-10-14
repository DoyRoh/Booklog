-- 책숲 공식 숲지기 2명 + 공개 그룹 6개 (연령별 추천도서 4 + 수상작 2).
--
-- 왜: 처음 온 부모가 "그룹 찾기"에서 바로 팔로우할 곳이 있어야 한다. 그룹은
-- groups.verified = true 라서 "책숲 공식" 배지가 붙고 둘러보기 맨 위에 뜬다.
-- 목록은 책숲이 고른 큐레이션이다(AI가 지어낸 목록이 아님 -- 실제 출간된 책만).
--
-- 순서
--   1) 대시보드 → Authentication → Users → Add user → Create new user,
--      "Auto Confirm User" 체크. 비밀번호는 아무거나(이 계정으로 로그인할 일은 거의 없음).
--        byul890808+guide@gmail.com    (책숲 길잡이 · 연령별)
--        byul890808+award@gmail.com    (책숲 수상작 서가)
--   2) 이 파일 전체를 SQL Editor에서 실행. 여러 번 실행해도 중복으로 안 생긴다.
--      (책을 더 넣고 싶으면 아래 목록에 줄을 더하고 다시 실행)
--   3) 운영자 계정(byul890808@gmail.com)으로 앱 → 프로필·설정 → 운영 도구 →
--      "공식 숲지기 책 표지 채우기"를 남은 책이 0이 될 때까지 누른다(카카오 검색으로
--      표지·출판사·ISBN을 채움).
--   마이그레이션 0001~0034가 먼저 적용돼 있어야 한다.

do $$
declare
  k record;
  g record;
  b record;
  v_user uuid;
  v_group uuid;
  v_list uuid;
  v_book uuid;
begin
  -- 숲지기
  for k in
    select * from (values
      ('byul890808+guide@gmail.com', '책숲 길잡이', 'bear'),
      ('byul890808+award@gmail.com', '책숲 수상작 서가', 'egret')
    ) as t(email, op_name, avatar)
  loop
    select id into v_user from auth.users where email = k.email;
    if v_user is null then
      raise exception '% 계정이 없어요. 대시보드 Authentication → Add user로 먼저 만들어 주세요.', k.email;
    end if;
    update public.users
       set onboarding_completed = true, active_profile_type = 'operator',
           operator_name = k.op_name, operator_avatar = k.avatar
     where id = v_user;
  end loop;

  -- 그룹
  for g in
    select * from (values
      ('byul890808+guide@gmail.com', 'age03', '처음 만나는 그림책 · 0~3세', 'community',
       '소리 내 읽기 좋고, 손으로 넘기며 반복해 보는 첫 그림책들이에요. 책숲이 골랐어요.'),
      ('byul890808+guide@gmail.com', 'age45', '함께 읽는 그림책 · 4~5세', 'community',
       '이야기가 있는 그림책을 처음 즐기는 나이. 읽어 주면 같이 웃고 묻는 책들이에요.'),
      ('byul890808+guide@gmail.com', 'age67', '생각이 자라는 그림책 · 6~7세', 'community',
       '마음과 관계를 이야기하기 좋은 그림책. 읽고 나서 "너라면?"을 물어보세요.'),
      ('byul890808+guide@gmail.com', 'el12', '혼자 읽기 시작할 때 · 초등 1~2학년', 'community',
       '그림책에서 글 많은 책으로 넘어가는 다리가 되어 주는 동화들이에요.'),
      ('byul890808+award@gmail.com', 'caldecott', '칼데콧 메달 수상작', 'creator',
       '미국도서관협회가 해마다 그 해 가장 뛰어난 그림책 한 권에 주는 칼데콧 메달. 우리말로 나온 수상작을 모았어요.'),
      ('byul890808+award@gmail.com', 'korea', '세계가 상을 준 한국 그림책 작가', 'creator',
       '백희나(2020 아스트리드 린드그렌 추모상)와 이수지(2022 한스 크리스티안 안데르센상 일러스트레이터 부문)의 그림책.')
    ) as t(email, key, name, type, description)
  loop
    select id into v_user from auth.users where email = g.email;
    select id into v_group from public.groups where owner_id = v_user and name = g.name;
    if v_group is null then
      v_group := gen_random_uuid();
      insert into public.groups (id, name, type, join_policy, owner_id, description, verified, operator_name, operator_avatar)
        select v_group, g.name, g.type, 'open', v_user, g.description, true, u.operator_name, u.operator_avatar
          from public.users u where u.id = v_user;
      insert into public.group_members (group_id, user_id, role, status, approved_at, approved_by, joined_at)
        values (v_group, v_user, 'teacher', 'approved', now(), v_user, now());
    else
      update public.groups set description = g.description, verified = true where id = v_group;
    end if;

    select id into v_list from public.book_lists where group_id = v_group order by created_at limit 1;
    if v_list is null then
      v_list := gen_random_uuid();
      insert into public.book_lists (id, group_id, name) values (v_list, v_group, '추천도서');
    end if;

    for b in
      select * from (values
        ('age03', '사과가 쿵!', '다다 히로시', '창작'),
        ('age03', '달님 안녕', '하야시 아키코', '창작'),
        ('age03', '싹싹싹', '하야시 아키코', '인성'),
        ('age03', '손이 나왔네', '하야시 아키코', '인성'),
        ('age03', '배고픈 애벌레', '에릭 칼', '과학'),
        ('age03', '잘 자요, 달님', '마거릿 와이즈 브라운', '창작'),
        ('age03', '곰 사냥을 떠나자', '마이클 로젠', '창작'),
        ('age03', '응가하자 끙끙', '최민오', '인성'),
        ('age03', '두드려 보아요!', '안나 클라라 티돌름', '창작'),

        ('age45', '구름빵', '백희나', '창작'),
        ('age45', '강아지똥', '권정생', '인성'),
        ('age45', '무지개 물고기', '마르쿠스 피스터', '인성'),
        ('age45', '누가 내 머리에 똥 쌌어?', '베르너 홀츠바르트', '과학'),
        ('age45', '수박 수영장', '안녕달', '창작'),
        ('age45', '100층짜리 집', '이와이 도시오', '수학'),
        ('age45', '고녀석 맛있겠다', '미야니시 타츠야', '인성'),
        ('age45', '팥죽 할멈과 호랑이', '박윤규', '명작'),

        ('age67', '알사탕', '백희나', '창작'),
        ('age67', '지각대장 존', '존 버닝햄', '창작'),
        ('age67', '돼지책', '앤서니 브라운', '인성'),
        ('age67', '우리 엄마', '앤서니 브라운', '인성'),
        ('age67', '고함쟁이 엄마', '유타 바우어', '인성'),
        ('age67', '줄무늬가 생겼어요', '데이빗 섀논', '인성'),
        ('age67', '프레드릭', '레오 리오니', '명작'),
        ('age67', '슈퍼 거북', '유설화', '인성'),

        ('el12', '만복이네 떡집', '김리리', '창작'),
        ('el12', '책 먹는 여우', '프란치스카 비어만', '창작'),
        ('el12', '나쁜 어린이 표', '황선미', '인성'),
        ('el12', '내 짝꿍 최영대', '채인선', '인성'),
        ('el12', '짜장 짬뽕 탕수육', '김영주', '인성'),
        ('el12', '화요일의 두꺼비', '러셀 에릭슨', '명작'),
        ('el12', '엄마 마중', '이태준', '명작'),
        ('el12', '아낌없이 주는 나무', '셸 실버스타인', '명작'),
        ('el12', '샬롯의 거미줄', 'E. B. 화이트', '명작'),

        ('caldecott', '아기 오리들한테 길을 비켜 주세요', '로버트 맥클로스키', '명작'),
        ('caldecott', '작은 집 이야기', '버지니아 리 버튼', '명작'),
        ('caldecott', '눈 오는 날', '에즈라 잭 키츠', '명작'),
        ('caldecott', '괴물들이 사는 나라', '모리스 샌닥', '명작'),
        ('caldecott', '폴라 익스프레스', '크리스 반 알스버그', '명작'),
        ('caldecott', '부엉이와 보름달', '제인 욜런', '명작'),
        ('caldecott', '시간 상자', '데이비드 위즈너', '명작'),
        ('caldecott', '사자와 생쥐', '제리 핑크니', '명작'),
        ('caldecott', '아모스 할아버지가 아픈 날', '필립 C. 스테드', '명작'),
        ('caldecott', '위니를 찾아서', '린지 매틱', '명작'),
        ('caldecott', '안녕, 나의 등대', '소피 블랙올', '명작'),

        ('korea', '구름빵', '백희나', '창작'),
        ('korea', '알사탕', '백희나', '창작'),
        ('korea', '장수탕 선녀님', '백희나', '창작'),
        ('korea', '이상한 엄마', '백희나', '창작'),
        ('korea', '달 샤베트', '백희나', '창작'),
        ('korea', '나는 개다', '백희나', '창작'),
        ('korea', '파도야 놀자', '이수지', '창작'),
        ('korea', '그림자놀이', '이수지', '창작'),
        ('korea', '거울 속으로', '이수지', '창작'),
        ('korea', '여름이 온다', '이수지', '창작')
      ) as t(key, title, author, category)
      where t.key = g.key
    loop
      -- 이미 카탈로그에 같은 제목·작가의 책이 있으면(띄어쓰기·문장부호 무시) 재사용.
      select id into v_book from public.books
       where regexp_replace(title, '[[:space:][:punct:]]', '', 'g') = regexp_replace(b.title, '[[:space:][:punct:]]', '', 'g')
         and coalesce(author, '') like '%' || b.author || '%'
       order by (cover_url is not null) desc, created_at
       limit 1;
      if v_book is null then
        v_book := gen_random_uuid();
        insert into public.books (id, title, author, source) values (v_book, b.title, b.author, 'curated');
      else
        -- 표지 없이 직접 입력됐던 책이면 표지 채우기 대상에 넣는다.
        update public.books set source = 'curated' where id = v_book and cover_url is null and source = 'manual';
      end if;
      insert into public.book_categories (book_id, category) values (v_book, b.category) on conflict do nothing;
      insert into public.book_list_items (book_list_id, book_id, required) values (v_list, v_book, false)
        on conflict (book_list_id, book_id) do nothing;
    end loop;
  end loop;

  raise notice '완료 -- 공식 숲지기 2명, 그룹 6개. 이제 앱에서 "공식 숲지기 책 표지 채우기"를 눌러 주세요.';
end $$;
