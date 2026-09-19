-- 계정 삭제(회원 탈퇴)를 앱 안에서 직접 할 수 있게 하는 함수.
-- Apple 심사 규정 5.1.1(v)("계정을 만들 수 있는 앱은 앱 안에서 계정 삭제도
-- 할 수 있어야 한다")를 만족시키기 위한 것으로, 지금까지는 운영자가 SQL로
-- 처리해 주는 방법뿐이었다.
--
-- 왜 SECURITY DEFINER 함수인가: 로그인한 사용자(authenticated 롤)는
-- auth.users를 직접 지울 권한이 없고, 서비스 롤 키는 이 프로젝트에 두지
-- 않기로 했다(그동안의 원칙). 함수 소유자(postgres) 권한으로 실행되는
-- 함수 안에서 auth.uid()의 계정만 지우면 다른 사람 계정에는 손댈 수 없다.
--
-- 삭제 순서는 supabase/seed/reset_all.sql과 같은 이유로 "참조하는 쪽부터":
-- groups.owner_id / assignments.created_by / group_members.approved_by는
-- on delete cascade가 없어서, 그대로 두면 auth.users 삭제가 외래키 위반으로
-- 실패한다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '로그인이 필요해요.';
  end if;

  -- 1) 내가 유일한 보호자인 아이: 사진·음성 파일(비공개 버킷, 경로가
  --    {child_id}/...)부터 지우고 아이 행을 지운다(독서기록·그룹 소속·
  --    책장 이름표·숙제 답변은 cascade). 다른 보호자가 함께 등록된 아이는
  --    남기고 내 보호자 연결만 끊긴다(개인정보처리방침에 적힌 대로).
  create temp table _my_children on commit drop as
    select cg.child_id
    from child_guardians cg
    where cg.user_id = v_uid
      and not exists (
        select 1 from child_guardians other
        where other.child_id = cg.child_id and other.user_id <> v_uid
      );

  delete from storage.objects o
  where o.bucket_id = 'reading-media'
    and exists (
      select 1 from _my_children c
      where o.name like c.child_id::text || '/%'
    );

  delete from children c where c.id in (select child_id from _my_children);

  -- 2) 내가 그룹장인 그룹: 그 그룹 숙제의 낭독 녹음 파일({child_id}/mission-{id}...)을
  --    지우고 그룹을 지운다(숙제·추천도서·그룹원은 cascade,
  --    reading_records.group_id는 0023으로 set null).
  delete from storage.objects o
  where o.bucket_id = 'reading-media'
    and exists (
      select 1
      from assignment_missions am
      join assignments a on a.id = am.assignment_id
      join groups g on g.id = a.group_id
      where g.owner_id = v_uid
        and split_part(o.name, '/', 2) like 'mission-' || am.id::text || '%'
    );

  delete from groups g where g.owner_id = v_uid;

  -- 3) 남의 그룹에 남긴 "누가 만들었는지/승인했는지" 기록만 비운다(데이터는 보존).
  update assignments set created_by = null where created_by = v_uid;
  update group_members set approved_by = null where approved_by = v_uid;

  -- 4) 계정. public.users → consents / child_guardians / group_members(user_id)는
  --    cascade, book_questions.created_by는 set null(0009). 공유 카탈로그
  --    (books·book_isbns·book_categories·book-covers 버킷)는 개인정보가 아니라
  --    다른 사용자의 책장에서 계속 쓰이므로 남긴다.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
