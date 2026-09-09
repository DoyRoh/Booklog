-- 0016~0020 마이그레이션을 한 번에 적용하는 묶음 (Supabase SQL Editor에 통째로 붙여 넣어 실행).
-- 이미 일부를 적용했다면 그 번호 구간은 지우고 실행하세요(같은 컬럼을 두 번 추가하면 오류).

-- ===== 0016_active_profile_type =====
-- 계정 하나가 아이 프로필(부모)과 선생님/기관 프로필(그룹 운영진)을 동시에
-- 가질 수 있게 한다. users.role은 더 이상 화면을 가르는 절대 기준이 아니라
-- 온보딩에서 고른 최초 기본값일 뿐이고, 실제로 어느 화면을 보여줄지는 이
-- 컬럼(active_profile_type)으로 정한다. 어떤 그룹의 운영진인지는 이미
-- group_members가 진실의 원천이라 따로 저장하지 않고 그때그때 조회한다
-- (lib/active-profile.ts).
alter table users
  add column active_profile_type text not null default 'child'
    check (active_profile_type in ('child', 'operator'));

-- ===== 0017_child_sharing =====
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

-- ===== 0018_shelf_tags =====
-- 책장 정리(사용자 요청) -- "6살 책장", "여름방학 책장"처럼 부모가 직접
-- 이름 붙인 폴더/태그로 독서기록을 묶어볼 수 있게 한다. 그룹(학급/기관)
-- 기준 출처 필터와는 별개로, 부모가 자유롭게 정하는 분류다.

create table shelf_tags (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (child_id, name)
);

alter table reading_records
  add column shelf_tag_id uuid references shelf_tags(id) on delete set null;
-- 이름표를 지워도 그 이름표가 붙어있던 기록 자체는 지워지지 않고
-- 이름표만 떨어진다(on delete set null).

alter table shelf_tags enable row level security;

-- child_guardians 소유권 판정은 이미 public.is_child_guardian()로
-- 표준화돼 있다(마이그레이션 0002) -- 같은 함수를 그대로 재사용한다.
create policy "guardians manage shelf tags of own children"
on shelf_tags for all
using (public.is_child_guardian(child_id))
with check (public.is_child_guardian(child_id));

-- ===== 0019_operator_avatar =====
-- 선생님/기관 프로필(그룹 운영진)도 아이처럼 캐릭터 얼굴을 고를 수 있게
-- 한다 -- 곰(등불을 든 길잡이) 또는 백로(소식을 물어오는 새). 운영 프로필은
-- 계정당 하나(여러 그룹을 운영해도 사람은 한 명)라 users에 둔다.
-- 기존 "users update own row" 정책은 id = auth.uid()만 확인하므로 이 컬럼도
-- 본인만 바꿀 수 있다(추가 정책 불필요).
alter table users
  add column operator_avatar text
    check (operator_avatar in ('bear', 'egret'));

-- ===== 0020_unify_operator_roles =====
-- 선생님·기관·인플루언서를 "숲지기" 하나로 합친다.
--
-- 화면에서는 이미 구분을 없앴지만, RLS 정책 여러 곳(아이 이름 조회 0011,
-- 독서기록 조회 0002, 가입 승인 0002, 숙제·미션 관련 정책들)이
-- role in ('teacher','admin')만 허용해서 'curator'로 들어간 기존 운영진은
-- 아이들 상태를 볼 수 없다. 정책을 하나하나 고치는 대신 기존 curator
-- 멤버십을 teacher로 바꿔 두면 모든 정책이 그대로 똑같이 적용된다.
-- 새 그룹을 만들 때도 앱이 항상 'teacher'로 넣는다(app/recommend/create).
-- check 제약의 'curator' 값 자체는 남겨 둔다(과거 데이터·롤백 여지).
update group_members
   set role = 'teacher'
 where role = 'curator';

-- users.role의 'curator'도 같은 뜻으로 합친다(온보딩은 이제 'teacher'만 저장).
update users
   set role = 'teacher'
 where role = 'curator';
