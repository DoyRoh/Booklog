-- 숙제가 항상 "완독"은 아닐 수 있다(예: "이번 주는 30쪽까지만 읽어와요").
-- assignment_books.target_page가 null이면 기존처럼 완독이 기준이고,
-- 값이 있으면 그 페이지까지 읽은 것만으로도 완료로 친다.
alter table assignment_books
  add column target_page int;

-- "읽는 중" 상태의 책도 몇 쪽까지 읽었는지 남길 수 있다.
alter table reading_records
  add column pages_read int;

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
  and gm.status = 'approved' and gm.child_id is not null;
