-- 계정 삭제가 "Direct deletion from storage tables is not allowed. Use the
-- Storage API instead."로 실패하던 것을 고친다.
--
-- Supabase가 storage.objects를 SQL로 직접 지우는 것을 트리거로 막기 시작해서,
-- 0029의 delete_my_account() 안의 `delete from storage.objects ...` 두 줄이
-- 함수 전체를 실패시켰다(트랜잭션이라 아무것도 안 지워짐). 이제 파일은
-- 앱이 Storage API로 먼저 지우고(best effort), 이 함수는 DB 행만 지운다.
--
-- 1) my_account_media_paths(): 계정을 지우면 함께 사라질 아이(내가 유일한
--    보호자인 아이)의 reading-media 파일 경로 목록. 앱이 이걸 받아
--    storage.from('reading-media').remove(paths)로 지운 뒤 2)를 부른다.
--    파일 삭제는 storage RLS(child_guardians 기준)를 그대로 통과하므로,
--    아직 보호자 연결이 살아 있는 2) 호출 "전"에 해야 한다.
--    공동 보호자가 있는 아이의 파일, 내가 운영한 그룹의 다른 아이 낭독
--    녹음은 그 아이 보호자의 데이터라 목록에 넣지 않는다.
-- 2) delete_my_account(): 0029와 같되 storage.objects를 건드리지 않는다.
--    앱이 파일 삭제에 실패해도 계정 삭제는 진행되고, 남은 파일은 보호자
--    연결이 없어 아무도 읽을 수 없다(storage RLS).

create or replace function public.my_account_media_paths()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'reading-media'
    and auth.uid() is not null
    and exists (
      select 1 from child_guardians cg
      where cg.user_id = auth.uid()
        and o.name like cg.child_id::text || '/%'
        and not exists (
          select 1 from child_guardians other
          where other.child_id = cg.child_id and other.user_id <> auth.uid()
        )
    );
$$;

revoke all on function public.my_account_media_paths() from public;
grant execute on function public.my_account_media_paths() to authenticated;

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

  -- 1) 내가 유일한 보호자인 아이(독서기록·그룹 소속·책장 이름표·숙제 답변은
  --    cascade). 공동 보호자가 있는 아이는 남기고 내 연결만 끊긴다.
  delete from children c
  where c.id in (
    select cg.child_id
    from child_guardians cg
    where cg.user_id = v_uid
      and not exists (
        select 1 from child_guardians other
        where other.child_id = cg.child_id and other.user_id <> v_uid
      )
  );

  -- 2) 내가 그룹장인 그룹(숙제·추천도서·그룹원 cascade,
  --    reading_records.group_id는 0023으로 set null).
  delete from groups g where g.owner_id = v_uid;

  -- 3) 남의 그룹에 남긴 "누가 만들었는지/승인했는지" 기록만 비운다.
  update assignments set created_by = null where created_by = v_uid;
  update group_members set approved_by = null where approved_by = v_uid;

  -- 4) 계정(public.users 이하 cascade, book_questions.created_by는 set null).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
