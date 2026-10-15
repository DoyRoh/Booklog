-- 그룹에 중간에 들어온 아이에게, 들어오기 전에 이미 마감된 숙제는 "그 아이의
-- 숙제"가 아니다(사용자 결정: 합류 전 숙제는 접어 두기).
--
-- assignment_completion은 숙제 완료율(선생님 화면·내보내기·대시보드), 숙제 배지,
-- 아이 숙제 판정이 전부 보는 뷰라 여기 한 곳에 조건을 건다: 숙제의 실제 마감일이
-- 그 아이의 합류일 이후인 행만 남긴다. 합류 전에 냈어도 아직 진행 중이던 숙제는
-- 그대로 대상이다.
--
--  - 실제 마감일 = end_date, 없으면 시작일(없으면 만든 날, 한국 날짜) + 6일
--    (lib/assignment-period.ts의 effectiveRange와 같은 규칙).
--  - 합류일 = approved_at, 없으면 requested_at(공개 그룹 팔로우는 approved_at을
--    안 남긴다). 그룹을 나갔다 다시 들어오면 행이 새로 생기므로 자연히 마지막
--    합류일이 기준이 된다.
create or replace view assignment_completion
with (security_invoker = true) as
select
  am.id as assignment_id,
  ab.book_id,
  gm.child_id,
  exists (
    select 1 from reading_records rr
    where rr.child_id = gm.child_id and rr.book_id = ab.book_id
      and (
        rr.status = 'done'
        or (
          ab.target_page is not null
          and rr.status = 'reading'
          and rr.pages_read is not null
          and rr.pages_read >= ab.target_page
        )
      )
  ) as completed
from assignment_books ab
join assignments am on am.id = ab.assignment_id
join group_members gm on gm.group_id = am.group_id
  and gm.status = 'approved' and gm.child_id is not null
where coalesce(
        am.end_date,
        coalesce(am.start_date, (am.created_at at time zone 'Asia/Seoul')::date) + 6
      ) >= (coalesce(gm.approved_at, gm.requested_at) at time zone 'Asia/Seoul')::date;
