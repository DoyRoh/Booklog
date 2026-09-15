-- 표지 사진 업로드용 Storage 버킷. books/book_isbns는 로그인한 사용자
-- 누구나 읽고 쓰는 공유 카탈로그라(0002 "to authenticated using(true)"),
-- 표지도 아이 개인 정보가 아니라 책 자체의 정보 -- reading-media(비공개,
-- child_id 폴더)와 달리 공개 버킷으로 만들어 어디서든(책장·숲길·숙제
-- 목록 등) 서명 없이 <img src>로 바로 보여줄 수 있게 한다.
--
-- 경로 규칙: "{uploader_user_id}/{uuid}.{ext}" -- 소유권 판정 기준이
-- child_id가 아니라 "누가 올렸는가"뿐이라 uploader의 auth.uid()로 충분.
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

create policy "anyone can view book covers"
on storage.objects for select
using (bucket_id = 'book-covers');

create policy "authenticated users upload their own book cover files"
on storage.objects for insert
with check (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "uploaders manage their own book cover files"
on storage.objects for update
using (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "uploaders delete their own book cover files"
on storage.objects for delete
using (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = auth.uid()::text
);
