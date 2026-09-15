-- 추천도서 목록을 "언제 올렸는지" 날짜 줄로 보여주기 위해(날짜 · 분야 · 내용
-- 한 줄 목록) book_list_items에 추가 시각을 둔다. 기존 행은 지금 시각으로
-- 채워진다(원래 언제 올렸는지는 남아 있지 않음).
alter table book_list_items
  add column if not exists created_at timestamptz not null default now();
