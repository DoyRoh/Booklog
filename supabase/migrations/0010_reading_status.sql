-- 사용자 요청: 책 상태를 읽고싶은 책/읽는중/읽음 세 가지로 구분하고
-- 업데이트할 수 있게. 기존 행은 전부 "책 등록 = 다 읽고 기록" 흐름으로
-- 만들어진 것이라 기본값을 'done'으로 둬서 의미가 그대로 유지된다.
alter table reading_records
  add column status text not null default 'done'
  check (status in ('want', 'reading', 'done'));

-- 숙제 완료 판정은 실제로 다 읽은 것만 인정해야 한다 -- "읽고 싶어요"만
-- 눌러둔 걸 완료로 잘못 세면 안 되므로 뷰에 상태 조건을 더한다.
create or replace view assignment_completion
with (security_invoker = true) as
select
  am.id as assignment_id,
  ab.book_id,
  gm.child_id,
  exists (
    select 1 from reading_records rr
    where rr.child_id = gm.child_id and rr.book_id = ab.book_id and rr.status = 'done'
  ) as completed
from assignment_books ab
join assignments am on am.id = ab.assignment_id
join group_members gm on gm.group_id = am.group_id
  and gm.status = 'approved' and gm.child_id is not null;
