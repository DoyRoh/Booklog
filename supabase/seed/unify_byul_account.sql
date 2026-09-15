-- byul890808@gmail.com 계정 하나에 아이 프로필(유안이)과 선생님 프로필
-- (하바 7세반)을 같이 붙인다. 이 계정은 이미 회원가입/온보딩을 마친
-- 부모 계정이라고 가정하고(유안이가 이미 등록돼 있으면 그대로 재사용,
-- 없으면 새로 만듦), "하바 7세반" 그룹(supabase/seed/sample_haba7.sql로
-- 만들어진 것)의 운영진(teacher)으로 추가한다. 기존 교사 계정
-- (sangwkk@naver.com)의 운영진 자격은 그대로 두고 건드리지 않는다.
--
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 실행하세요. 마이그레이션
-- 0016(active_profile_type)이 먼저 적용되어 있어야 합니다.

do $$
declare
  v_user_id uuid;
  v_child_id uuid;
  v_group_id uuid;
begin
  select id into v_user_id from auth.users where email = 'byul890808@gmail.com';
  if v_user_id is null then
    raise exception 'byul890808@gmail.com 계정을 먼저 앱에서 회원가입해 주세요.';
  end if;

  select g.id into v_group_id from public.groups g where g.name = '하바 7세반' limit 1;
  if v_group_id is null then
    raise exception '"하바 7세반" 그룹을 찾을 수 없어요. supabase/seed/sample_haba7.sql을 먼저 실행해 주세요.';
  end if;

  -- 유안이 아이 프로필: 이미 이 계정의 아이 중에 "유안"이 있으면 그대로
  -- 쓰고, 없으면 새로 만든다.
  select cg.child_id into v_child_id
    from public.child_guardians cg
    join public.children c on c.id = cg.child_id
    where cg.user_id = v_user_id and c.name = '유안'
    limit 1;

  if v_child_id is null then
    v_child_id := gen_random_uuid();
    insert into public.children (id, name, avatar) values (v_child_id, '유안', 'rabbit');
    insert into public.child_guardians (child_id, user_id, role) values (v_child_id, v_user_id, 'owner');
    raise notice '유안이 아이 프로필을 새로 만들었어요: child_id=%', v_child_id;
  else
    raise notice '이미 있는 유안이 아이 프로필을 그대로 써요: child_id=%', v_child_id;
  end if;

  -- 선생님 프로필: 이 계정을 "하바 7세반"의 teacher로 추가한다(이미
  -- 있으면 건드리지 않음 -- group_members에 (group_id,user_id) 유니크
  -- 제약이 있어서 중복 삽입은 그냥 막힌다).
  insert into public.group_members (group_id, user_id, role, status, approved_at, approved_by, joined_at)
    values (v_group_id, v_user_id, 'teacher', 'approved', now(), v_user_id, now())
    on conflict (group_id, user_id) where user_id is not null do nothing;

  -- 계정에 방금 두 프로필이 다 생겼으니, 기본으로는 아이 프로필(유안이)이
  -- 보이도록 해 둔다. 선생님 프로필은 더보기에서 바로 전환할 수 있다.
  update public.users
    set active_profile_type = 'child', active_child_id = v_child_id
    where id = v_user_id;

  raise notice '완료 -- user_id=%, child_id=%, group_id=%', v_user_id, v_child_id, v_group_id;
end $$;
