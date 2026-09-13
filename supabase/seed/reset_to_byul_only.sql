-- byul890808@gmail.com 계정만 남기고 다른 테스트 계정(학원/교사, 큐레이터
-- 등)과 그 계정에 딸린 데이터를 전부 지워서 새로 테스트할 수 있게 한다.
--
-- ⚠️ 되돌릴 수 없는 삭제입니다. Supabase 대시보드에 백업/PITR이 있다면
-- 먼저 확인해 두는 걸 권장합니다. 실행 전에 이 파일 전체를 한 번 읽어보고
-- Supabase SQL Editor에 붙여넣어 실행하세요.
--
-- 처리 순서가 중요한 이유:
-- 1) groups.owner_id/assignments.created_by/group_members.approved_by는
--    참조하는 users 행이 지워질 때 자동으로 정리되지 않습니다(원본
--    스키마에 on delete cascade가 없음) -- 그대로 두면 다른 계정을 지울 때
--    "update or delete on table users violates foreign key constraint"로
--    실패합니다. owner_id는 not null이라 byul890808로 옮기고(그룹과 그
--    안의 추천도서 데이터는 그대로 유지), created_by/approved_by는
--    nullable이라 그냥 비웁니다(누가 승인/생성했는지 기록만 없어질 뿐
--    데이터 자체는 안 지워집니다).
-- 2) auth.users를 지우면 public.users/child_guardians/group_members
--    (user_id)/consents는 on delete cascade로 자동 정리됩니다.
-- 3) children은 child_guardians를 통한 다대다라, 보호자 계정을 지워도
--    children 행 자체는 자동으로 안 지워집니다(고아 행으로 남음) --
--    마지막에 "보호자가 하나도 안 남은 아이"만 명시적으로 지웁니다
--    (byul890808의 아이는 계속 보호자가 있으니 안전합니다).

begin;

do $$
declare
  v_byul_id uuid;
begin
  select id into v_byul_id from auth.users where email = 'byul890808@gmail.com';
  if v_byul_id is null then
    raise exception 'byul890808@gmail.com 계정을 먼저 찾을 수 없어요 -- 이메일을 확인해 주세요.';
  end if;

  update public.groups
    set owner_id = v_byul_id
    where owner_id <> v_byul_id;

  update public.assignments
    set created_by = null
    where created_by is not null and created_by <> v_byul_id;

  update public.group_members
    set approved_by = null
    where approved_by is not null and approved_by <> v_byul_id;
end $$;

delete from auth.users
where email <> 'byul890808@gmail.com';

delete from public.children c
where not exists (
  select 1 from public.child_guardians cg where cg.child_id = c.id
);

commit;
