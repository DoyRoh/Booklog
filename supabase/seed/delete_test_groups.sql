-- 테스트용 그룹 두 개("Haba 7세반", "국립어린이청소년도서관")와 거기에 딸린
-- 데이터를 전부 지운다(사용자 요청: "다 지워. 없애 첨부터 다시 시작하게").
--
-- ⚠️ 되돌릴 수 없습니다. 계정·아이·책 카탈로그는 남고, 이 두 그룹에 속한
-- 추천도서 목록·숙제·미션 응답·멤버십·그리고 이 그룹으로 남긴 독서기록과
-- 낭독 녹음 파일이 지워집니다. 독서기록을 살리고 그룹 연결만 끊고 싶으면
-- 아래 3)의 delete 대신 주석 처리된 update 줄을 쓰세요.
-- Supabase SQL Editor에 전체를 붙여넣어 실행하세요.

begin;

create temp table _gone as
  select id from public.groups
  where name in ('Haba 7세반', '하바 7세반', '국립어린이청소년도서관');

-- 1) 낭독 미션 녹음 파일 (경로: {child_id}/mission-{mission_id}.*)
delete from storage.objects o
using public.assignment_missions m
join public.assignments a on a.id = m.assignment_id
where o.bucket_id = 'reading-media'
  and a.group_id in (select id from _gone)
  and o.name like '%/mission-' || m.id::text || '%';

-- 2) 숙제 (assignment_books / assignment_missions / 응답은 cascade)
delete from public.assignments where group_id in (select id from _gone);

-- 3) 이 그룹으로 남긴 독서기록 -- reading_records.group_id는 cascade가 없어서
--    그룹보다 먼저 정리해야 한다.
delete from storage.objects o
using public.reading_records r
where o.bucket_id = 'reading-media'
  and r.group_id in (select id from _gone)
  and (o.name = r.photo_url or o.name = r.voice_url);
delete from public.reading_records where group_id in (select id from _gone);
-- 기록은 남기고 그룹 연결만 끊으려면 위 두 문장 대신:
-- update public.reading_records set group_id = null where group_id in (select id from _gone);

-- 4) 그룹 (group_members / book_lists / book_list_items는 cascade)
delete from public.groups where id in (select id from _gone);

-- 5) 운영하던 그룹이 없어진 계정은 아이 프로필로 되돌린다.
update public.users set active_profile_type = 'child'
where active_profile_type = 'operator'
  and not exists (
    select 1 from public.group_members gm
    where gm.user_id = users.id and gm.status = 'approved'
      and gm.role in ('teacher', 'admin', 'curator')
  );

drop table _gone;
commit;

-- 확인: 두 그룹이 안 나오면 성공
select id, name from public.groups order by created_at;
