-- 국립어린이청소년도서관 사서추천도서 API 연동을 위한 준비.
-- 외부 API를 주기적으로 다시 불러와 같은 책 목록에 upsert할 때, ISBN이
-- 없는 책(사서추천도서 API는 ISBN을 안 줌)도 같은 book_id가 두 번 들어가지
-- 않도록 (book_list_id, book_id) 조합에 유니크 제약을 건다.
alter table book_list_items
  add constraint book_list_items_list_book_unique unique (book_list_id, book_id);
