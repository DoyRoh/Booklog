-- 책장(아이 프로필) 공유 -- 배우자·조부모 등 다른 보호자를 초대해서 같은
-- 아이의 독서기록을 함께 볼 수 있게 한다.
--
-- 이 작업을 하면서 기존 RLS의 구멍을 하나 발견해 같이 막았다:
-- "users manage own guardian links" 정책은 user_id = auth.uid()만 확인하고
-- child_id 소유권은 전혀 확인하지 않았다 -- 새 아이를 만들 때 첫 보호자
-- (owner)로 자기 자신을 등록하는 부트스트랩을 지원하려고 일부러 넓게
-- 열어뒀던 것인데, 그 결과 child_id(UUID)를 어떤 경로로든 알게 된
-- 사용자는 누구나 그 아이의 보호자로 스스로를 등록해 독서기록·사진·음성
-- 전체에 접근할 수 있었다. 아래에서 "최초 보호자 등록"만 클라이언트에서
-- 직접 허용하고, 그 이후의 보호자 추가는 초대 코드를 실제로 아는 사람만
-- 통과하는 함수 하나로 좁힌다.

alter table children add column invite_code text unique;

drop policy "users manage own guardian links" on child_guardians;

-- 부트스트랩: 새로 만든 아이의 첫 보호자(owner)로 자기 자신을 등록하는
-- 경우만 허용한다 -- 이미 보호자가 한 명이라도 있는 아이에는 이 정책으로
-- 끼어들 수 없다.
create policy "users create their own new child link"
on child_guardians for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1 from child_guardians cg2 where cg2.child_id = child_guardians.child_id
  )
);

create policy "users update own guardian link"
on child_guardians for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users delete own guardian link"
on child_guardians for delete
using (user_id = auth.uid());

-- 초대 코드로 두 번째 이후 보호자를 추가하는 유일한 경로. SECURITY
-- DEFINER라 위 INSERT 정책을 우회하지만, 그 안에서 코드가 실제로
-- 일치하는지 직접 확인하므로 코드를 모르면 통과할 수 없다.
-- 반환 컬럼명을 child_id/child_name으로 하면 plpgsql이 그 이름을 OUT
-- 파라미터(암묵적 변수)로 선언해서, 아래 insert 문의 "child_id"(테이블
-- 컬럼)와 이름이 겹쳐 "column reference is ambiguous" 에러가 난다(로컬
-- Postgres 테스트에서 실제로 발생을 확인). find_group_by_invite_code와
-- 같은 규칙으로 id/name을 그대로 쓴다.
create function public.join_child_by_invite_code(p_code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
  v_child_name text;
begin
  select c.id, c.name into v_child_id, v_child_name
  from children c
  where c.invite_code = p_code;

  if v_child_id is null then
    raise exception '유효하지 않은 공유 코드예요.';
  end if;

  insert into child_guardians (child_id, user_id, role)
  values (v_child_id, auth.uid(), 'guardian')
  on conflict (child_id, user_id) do nothing;

  return query select v_child_id, v_child_name;
end;
$$;

grant execute on function public.join_child_by_invite_code(text) to authenticated;
