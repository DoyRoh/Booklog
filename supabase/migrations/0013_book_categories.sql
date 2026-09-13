-- 그룹 추천도서를 HABA 100처럼 분야별로 묶어 보여주기 위한 책 카테고리.
-- 책 한 권이 "두 분야 수록"처럼 여러 카테고리에 속할 수 있어 조인 테이블로
-- 둔다. 고정 enum이 아니라 텍스트로 열어둬서, 나중에 카테고리를 늘려도
-- 마이그레이션이 필요 없다 -- 화면에 쓰는 표준 목록은 앱 코드 쪽에 둔다.
create table book_categories (
  book_id uuid not null references books(id) on delete cascade,
  category text not null,
  primary key (book_id, category)
);

alter table book_categories enable row level security;

-- books/book_isbns와 같은 원칙: 로그인한 사용자 전체가 공유하는 카탈로그
-- 메타데이터라 소유권 검사 없이 누구나 읽고 쓸 수 있다.
create policy "book categories are readable by authenticated users"
on book_categories for select
to authenticated
using (true);

create policy "authenticated users can add book categories"
on book_categories for insert
to authenticated
with check (true);

create policy "authenticated users can remove book categories"
on book_categories for delete
to authenticated
using (true);
