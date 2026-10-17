-- 영아책선생님 숲지기(byul890808+test@gmail.com) 그룹 채우기 (사용자 요청)
--
-- Supabase SQL Editor에서 실행(아무것도 선택하지 않은 상태로 Run). 여러 번 실행해도 중복으로 들어가지 않는다.
--   * 0-3세 그룹(이름에 0-3세 / 0~3세): 그림책 20권. 추천 연령 전부 0~3세.
--   * 전집 그룹(이름에 전집): 전집·시리즈 8개. 없으면 공개 크리에이터 그룹 영아·유아 전집을 새로 만든다.
--     추천 연령은 표에 적힌 나이대로(만 2-5세 → 0~3세 + 4~7세 등).
--   * 예전 버전 스크립트로 0-3세 그룹에 들어간 전집 8개는 그 그룹에서 뺀다(다른 그룹·아이 기록은 그대로).
--   * 분야는 전부 창작. 수상 + 추천 이유 + 아이에게 질문·놀이를 추천 이유·메모(note)에 넣는다.
--   * 같은 제목(띄어쓰기 무시) 책은 카탈로그에서 재사용, 없으면 source=curated 로 만들어
--     프로필·설정 → 운영 도구 → 공식 숲지기 책 표지 채우기로 표지가 붙는다.
--   * 숲지기가 이미 고친 연령·메모는 덮어쓰지 않는다.

do $infant03$
declare
  v_user uuid;
  v_group uuid;
  v_list uuid;
  v_set_group uuid;
  v_set_list uuid;
  v_target_list uuid;
  v_book uuid;
  v_names text;
  v_has_age boolean;
  v_has_note boolean;
  v_note text;
  b record;
begin
  select id into v_user from auth.users where lower(email) = 'byul890808+test@gmail.com' limit 1;
  if v_user is null then
    raise exception 'byul890808+test@gmail.com 계정이 없어요.';
  end if;

  select g.id into v_group
  from public.groups g
  where g.owner_id = v_user
    and regexp_replace(g.name, '\s', '', 'g') ~ '0[-~～]?3세'
  order by g.created_at
  limit 1;

  if v_group is null then
    select string_agg(name, ', ') into v_names from public.groups where owner_id = v_user;
    raise exception '0-3세 그룹을 못 찾았어요. 이 계정의 그룹: %', coalesce(v_names, '(없음)');
  end if;

  select id into v_list from public.book_lists where group_id = v_group order by created_at limit 1;
  if v_list is null then
    v_list := gen_random_uuid();
    insert into public.book_lists (id, group_id, name) values (v_list, v_group, '추천도서');
  end if;

  -- 전집 그룹: 이름에 전집이 들어간 그룹, 없으면 새로 만든다.
  select g.id into v_set_group
  from public.groups g
  where g.owner_id = v_user and g.name like '%전집%'
  order by g.created_at
  limit 1;
  if v_set_group is null then
    v_set_group := gen_random_uuid();
    insert into public.groups (id, name, type, join_policy, owner_id, invite_code, description, operator_name, operator_avatar)
      select v_set_group, '영아·유아 전집', 'creator', 'open', v_user,
             upper(substr(md5(random()::text), 1, 6)),
             '아기 때부터 유아기까지 오래 곁에 두고 보는 전집과 시리즈를 모았어요. 책마다 추천 나이와 함께 읽는 놀이를 적어 두었어요.',
             u.operator_name, u.operator_avatar
      from public.users u where u.id = v_user;
    insert into public.group_members (group_id, user_id, role, status, approved_at)
      values (v_set_group, v_user, 'teacher', 'approved', now());
  end if;
  select id into v_set_list from public.book_lists where group_id = v_set_group order by created_at limit 1;
  if v_set_list is null then
    v_set_list := gen_random_uuid();
    insert into public.book_lists (id, group_id, name) values (v_set_list, v_set_group, '추천도서');
  end if;

  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'book_list_items' and column_name = 'age_bands')
    into v_has_age;
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'book_list_items' and column_name = 'note')
    into v_has_note;

  for b in
    select * from (values
      ('pic',  1, array['infant'], '손이 나왔네', '하야시 아키코', null,
        '옷 속에 가려졌던 손과 머리, 발이 하나씩 나타나는 모습을 담았습니다. 짧은 말과 달라지는 아기의 표정을 보며, 매일 하는 옷 입기를 즐거운 발견 놀이로 만날 수 있습니다.',
        '“손이 어디 있지? 짠!” 옷소매에서 손을 꺼내며 놀아요.'),
      ('pic',  2, array['infant'], '구두 구두 걸어라', '하야시 아키코', null,
        '작은 구두가 걷고 뛰고 넘어지는 모습을 경쾌하게 보여 줍니다. 구두의 움직임을 발과 손으로 따라 하며, 처음 걸음마를 시작하는 아이도 자신의 경험과 연결해 즐길 수 있습니다.',
        '“우리 구두도 걸어 볼까?” 손가락 두 개로 책 위를 걸어요.'),
      ('pic',  3, array['infant'], '냠냠냠 쪽쪽쪽', '문승연', null,
        '친숙한 과일의 겉모습과 자른 모습을 차례로 보여 주는 아기 그림책입니다. 먹을 때 나는 맛있는 소리를 듣고 먹는 시늉을 하며, 그림 속 과일을 함께 나누는 놀이를 즐길 수 있습니다.',
        '“한 입 먹어 볼까?” 과일을 집어 냠냠 먹는 시늉을 해요.'),
      ('pic',  4, array['infant'], '뒹굴뒹굴 짝짝', '백연희 글 · 주경호 그림', null,
        '동물과 아이가 손뼉을 치고 두 팔을 올리며 함께 몸놀이를 합니다. 노랫말처럼 반복되는 문장에 맞춰 움직이다 보면, 책 읽는 시간이 자연스럽게 신나는 놀이 시간이 됩니다.',
        '“물개처럼 짝짝 해 볼까?” 아이가 할 수 있는 동작을 함께 해요.'),
      ('pic',  5, array['infant'], '어떻게 하면 좋지?', '와타나베 시게오 글 · 오오토모 야스오 그림', null,
        '셔츠와 바지를 엉뚱하게 입어 보는 아기 곰의 모습이 웃음을 줍니다. 익숙한 옷 입기 장면과 반복되는 질문을 통해, 어린이가 그림을 보며 다음 행동을 예상하는 재미를 느낄 수 있습니다.',
        '“바지를 팔에 끼우면 어떨까?” 옷을 대어 보고 함께 웃어요.'),
      ('pic',  6, array['infant'], '응가하자, 끙끙', '최민오', null,
        '동물들이 응가하는 익살스러운 표정과 서로 다른 똥 모양을 보여 줍니다. 반복되는 소리와 그림을 즐기며, 배변을 친숙하고 자연스러운 일상으로 만날 수 있습니다.',
        '“코끼리 똥은 어디 있지?” 그림을 가리키며 찾아봐요.'),
      ('pic',  7, array['infant'], '기차 ㄱㄴㄷ', '박은영', null,
        '간결하고 힘 있는 그림 속에서 기차가 여러 풍경을 지나갑니다. 글자를 몰라도 기차의 길을 손가락으로 따라가고 달리는 소리를 내며, 짧은 말의 리듬과 장면의 변화를 즐길 수 있습니다.',
        '“기차가 어디로 갈까?” 손가락으로 철길을 따라가요.'),
      ('pic',  8, array['infant'], '괜찮아', '최숙희', null,
        '작거나 가시가 많아도 저마다 멋진 모습을 지닌 동물들이 등장합니다. 짧게 반복되는 “괜찮아!”와 생생한 표정을 보며, 서로 다른 모습을 즐겁게 바라보는 따뜻한 그림책입니다.',
        '“이 동물은 무엇을 잘할까?” 그림 속 행동을 흉내 내요.'),
      ('pic',  9, array['infant'], '알록달록 동물원', '로이스 엘러트', '1990 칼데콧 아너상',
        '원과 삼각형 같은 도형이 겹쳐지고 사라지면서 새로운 동물 얼굴이 나타납니다. 글을 읽지 않아도 책장을 넘길 때마다 달라지는 모양과 선명한 색을 보며 발견의 즐거움을 느낄 수 있습니다.',
        '“이번에는 누구 얼굴이 나왔지?” 아는 동물 소리를 내 봐요.'),
      ('pic', 10, array['infant'], '빨강 파랑 강아지 공', '크리스 라쉬카', '2012 칼데콧 대상',
        '좋아하는 공을 가지고 노는 강아지의 기쁨과 속상함을 글 없이 표현했습니다. 몸짓과 표정만으로 이야기를 따라가며, 소중한 물건을 잃었을 때의 마음과 다시 함께 노는 기쁨을 느낄 수 있습니다.',
        '“강아지가 지금 어떤 기분일까?” 표정을 따라 해 봐요.'),
      ('pic', 11, array['infant'], '달님 안녕', '하야시 아키코', null,
        '밤하늘에 나타난 달님의 표정과 구름의 움직임만으로 작은 이야기가 펼쳐집니다. 달님에게 인사하고 익살스러운 얼굴을 따라 하며, 처음 책을 만나는 아기도 함께 즐길 수 있습니다.',
        '“달님 어디 있지?” 하며 가리키고 손을 흔들어요.'),
      ('pic', 12, array['infant'], '짠! 까꿍 놀이', '기무라 유이치', null,
        '얼굴을 가린 동물들이 책장을 넘기면 ‘까꿍!’ 하고 나타납니다. 나타날 순간을 기다리는 재미와 달라지는 표정이 어우러져, 책 읽기가 자연스럽게 까꿍놀이로 이어집니다.',
        '“누가 나올까?” 잠깐 기다렸다가 함께 “까꿍!” 해요.'),
      ('pic', 13, array['infant'], '싹싹싹', '하야시 아키코', null,
        '수프를 흘린 동물들을 닦아 주는 익숙한 일상을 짧고 경쾌하게 담았습니다. ‘싹싹싹’ 소리에 맞춰 그림과 아기의 손을 닦는 시늉을 하며 다정한 놀이를 즐길 수 있습니다.',
        '“곰 발도 닦아 줄까?” 그림 위를 살살 문질러요.'),
      ('pic', 14, array['infant'], '안아 줘!', '제즈 앨버로우', null,
        '서로 안아 주는 동물들을 바라보는 아기 침팬지의 마음이 표정과 몸짓으로 전해집니다. 아주 적은 말로도 이야기를 따라갈 수 있으며, 책 속 포옹을 실제 포옹으로 이어 가기 좋습니다.',
        '“우리도 안아 줄까?” 아이가 원하면 꼭 안아 주세요.'),
      ('pic', 15, array['infant'], '두드려 보아요', '안나 클라라 티돌름', null,
        '색색의 문을 두드리고 다음 장에서 그 안의 풍경을 만나는 참여형 그림책입니다. ‘똑똑똑’ 하는 동작과 반복되는 구성이 어우러져, 어린이가 직접 이야기를 여는 즐거움을 느낄 수 있습니다.',
        '“이 문도 두드려 볼까?” 함께 똑똑 두드려요.'),
      ('pic', 16, array['infant'], '사과가 쿵!', '다다 히로시', null,
        '커다란 사과 하나에 동물들이 차례로 모여드는 단순하고 유쾌한 이야기입니다. 사과를 먹는 다양한 소리와 점점 달라지는 그림을 보며, 다음 동물을 기다리는 재미를 즐길 수 있습니다.',
        '“토끼처럼 먹어 볼까?” 아삭아삭 먹는 시늉을 해요.'),
      ('pic', 17, array['infant'], '금붕어가 달아나네', '고미 타로', null,
        '어항 밖으로 달아난 금붕어가 알록달록한 그림 속에 숨어 있습니다. 짧은 말을 듣고 익숙한 모양을 찾아 손가락으로 짚으며, 스스로 발견하는 기쁨을 반복해서 맛볼 수 있습니다.',
        '“금붕어 어디 갔지?” 찾을 때까지 천천히 기다려 줘요.'),
      ('pic', 18, array['infant'], '머리부터 발끝까지', '에릭 칼', null,
        '동물들이 고개를 돌리고 팔을 흔들며 어린이에게 함께 움직이자고 초대합니다. 선명한 콜라주 그림과 반복되는 문장이 몸짓으로 이어져, 가만히 앉아 있기 어려운 아이도 신나게 참여할 수 있습니다.',
        '“원숭이처럼 팔을 흔들어 볼까?” 가능한 동작만 함께 해요.'),
      ('pic', 19, array['infant'], '안 돼, 데이빗!', '데이비드 섀넌', '1999 칼데콧 아너상',
        '물장난과 음식 장난 등 어린이에게 익숙한 소동을 과장된 그림으로 보여 줍니다. 짧게 반복되는 말과 개구쟁이의 행동을 보며 웃고, 마지막에는 변함없는 사랑을 확인할 수 있습니다.',
        '“데이빗이 또 뭘 하고 있지?” 그림 속 행동을 함께 찾아봐요.'),
      ('pic', 20, array['infant'], '무엇이 무엇이 먼저일까?', '로라 바카로 시거', '2008 칼데콧 아너상 · 테오도르 수스 가이젤 아너상',
        '페이지의 작은 구멍이 책장을 넘기면 전혀 다른 그림의 일부가 됩니다. 알과 병아리, 애벌레와 나비처럼 달라지는 모습을 보며, 웃음과 함께 ‘어!’ 하는 발견의 즐거움을 경험할 수 있습니다.',
        '“다음 장에는 뭐가 나올까?” 먼저 그림을 충분히 보게 해 주세요.'),
      -- 전집·시리즈 (다른 그룹으로)
      ('set',  1, array['infant'], '달님 안녕 시리즈 보드북 세트', '하야시 아키코 · 한림출판사', null,
        '『달님 안녕』, 『싹싹싹』, 『손이 나왔네』, 『구두 구두 걸어라』를 함께 만나는 첫 그림책 세트입니다. 짧은 말과 친숙한 일상, 달라지는 표정과 몸짓을 보며 책 읽기를 다정한 놀이로 시작할 수 있습니다.',
        '“손이 어디 있지?” 그림과 아이의 손을 번갈아 찾아봐요.'),
      ('set',  2, array['infant'], '베이비올 아기', '여러 작가 · 아람북스', null,
        '그림을 보고 소리를 듣고 책을 만지며 탐색하는 영아용 전집입니다. 아직 이야기를 길게 듣기 어려운 아기도 관심을 보이는 장면부터 짧게 즐기며, 생활 속 사물과 새로운 감각을 만나 볼 수 있습니다.',
        '“여기에는 뭐가 있을까?” 아이가 보고 만지는 부분을 말로 들려줘요.'),
      ('set',  3, array['infant','preschool'], '도레미곰', '여러 작가 · 그레이트북스', null,
        '그림과 이야기, 클래식 음악을 결합한 뮤지컬 그림책 전집입니다. 반복해서 듣는 노래가 이야기와 연결되어, 음악을 좋아하는 어린이가 책 속 장면과 말의 리듬을 친숙하게 즐길 수 있습니다.',
        '“이 장면에서는 어떤 동작을 하고 싶어?” 노래에 맞춰 움직여요.'),
      ('set',  4, array['infant','preschool'], '라라랜드', '여러 작가 · 아람북스', null,
        '음악과 결합된 이야기를 듣고 그림을 살펴보며 상상하는 창작 그림책 전집입니다. 등장인물의 말과 행동을 따라 하거나 장면을 놀이로 바꾸며, 듣는 즐거움을 자기만의 표현으로 이어 갈 수 있습니다.',
        '“네가 주인공이라면 어떻게 말했을까?” 목소리를 바꿔 연기해요.'),
      ('set',  5, array['infant','preschool'], '우당탕탕 야옹이 세트', '구도 노리코 · 책읽는곰', null,
        '먹음직스러운 음식과 분주한 작업장, 장난꾸러기 야옹이들의 소동이 가득한 시리즈입니다. 반복되는 전개를 기다리는 재미와 그림 구석구석을 발견하는 즐거움이 있어, 같은 책을 여러 번 펼치기 좋습니다.',
        '“야옹이들이 이번에는 무슨 일을 벌일까?” 다음 장면을 상상해요.'),
      ('set',  6, array['preschool'], '안녕, 마음아', '여러 작가 · 그레이트북스', '2016 한국출판문화대상 기획부문 대상',
        '속상함과 걱정, 고집과 자신감 등 어린이가 일상에서 만나는 마음을 이야기로 풀어낸 전집입니다. 주인공의 경험에 자신의 마음을 비추어 보며, 말로 표현하기 어려웠던 감정을 천천히 나눌 수 있습니다.',
        '“너도 이런 마음이 든 적 있어?” 대답하지 않아도 기다려 줘요.'),
      ('set',  7, array['infant','preschool'], '놀라운 자연', '여러 작가 · 그레이트북스', null,
        '생생한 사진과 이야기를 통해 동식물을 가까이 만나는 자연관찰 전집입니다. 처음에는 좋아하는 동물의 생김새를 구경하고, 자라면서 먹이와 서식지 등 궁금한 내용을 찾아보는 방식으로 즐길 수 있습니다.',
        '“이 동물은 어디에 숨어 있을까?” 사진 속 특징을 함께 찾아봐요.'),
      ('set',  8, array['preschool'], '내 친구 과학공룡', '여러 작가 · 그레이트북스', null,
        '생활 속 현상에 대한 궁금증을 이야기와 연결해 만나는 과학 전집입니다. 어린이가 “왜 그럴까?”라고 묻기 시작할 때 관심 있는 주제부터 읽으며, 주변을 관찰하고 직접 확인해 보는 즐거움으로 이어 가기 좋습니다.',
        '“정말 그렇게 될까?” 먼저 예상하고 생활 속에서 확인해 봐요.')
    ) as t(target, ord, bands, title, author, award, reason, play)
    order by target, ord
  loop
    v_target_list := case when b.target = 'set' then v_set_list else v_list end;

    select id into v_book from public.books
    where regexp_replace(title, '\s', '', 'g') = regexp_replace(b.title, '\s', '', 'g')
    order by (cover_url is null), created_at
    limit 1;
    if v_book is null then
      v_book := gen_random_uuid();
      insert into public.books (id, title, author, source) values (v_book, b.title, b.author, 'curated');
    end if;

    -- 전집은 0-3세 그룹에서 뺀다(예전 버전 스크립트로 들어간 것).
    if b.target = 'set' then
      delete from public.book_list_items where book_list_id = v_list and book_id = v_book;
    end if;

    -- 표의 순서대로 보이도록 올린 시각을 1초씩 벌린다(목록은 최근 올린 순이라 1번이 맨 위).
    insert into public.book_list_items (book_list_id, book_id, required, created_at)
      values (v_target_list, v_book, false, now() - make_interval(secs => b.ord))
      on conflict (book_list_id, book_id) do nothing;

    insert into public.book_categories (book_id, category)
      values (v_book, '창작')
      on conflict do nothing;

    if v_has_age then
      execute 'update public.book_list_items set age_bands = $1
               where book_list_id = $2 and book_id = $3 and age_bands is null'
        using b.bands, v_target_list, v_book;
    end if;
    if v_has_note then
      v_note := concat_ws(E'\n',
        case when b.award is not null then '수상: ' || b.award end,
        '추천 이유: ' || b.reason,
        '질문·놀이: ' || b.play);
      execute 'update public.book_list_items set note = $1
               where book_list_id = $2 and book_id = $3 and note is null'
        using v_note, v_target_list, v_book;
    end if;
  end loop;

  raise notice '완료: 0-3세 그룹 %, 전집 그룹 %', v_group, v_set_group;
end $infant03$;
