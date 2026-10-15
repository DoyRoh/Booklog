-- 숲지기가 추천도서 한 권에 붙이는 설명("왜 이 책을 추천하는지").
-- 카탈로그(books.introduction)는 모두가 같이 쓰는 책 소개라 건드리지 않고,
-- 그룹 목록의 책(book_list_items)에 숲지기 자신의 말로 둔다.
-- 쓰기 권한은 기존 "operators manage book_list_items"(0002) 그대로.
alter table public.book_list_items
  add column if not exists note text;
