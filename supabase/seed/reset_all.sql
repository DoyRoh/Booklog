-- 모든 데이터와 계정을 지워서 처음부터 다시 시작한다(사용자 요청:
-- "데이터 아이디 모두 다 삭제해줘 첨부터 새로해보게").
--
-- ⚠️ 되돌릴 수 없습니다. 본인 계정(byul890808@gmail.com)까지 전부 지워지므로
-- 실행 뒤에는 앱에서 다시 회원가입해야 합니다. 스키마·마이그레이션·RLS는
-- 그대로 남고, 마이그레이션 0009가 넣어준 기본 질문 은행(created_by가
-- null인 행)만 보존합니다. Supabase SQL Editor에 전체를 붙여넣어 실행하세요.
--
-- 삭제 순서가 중요한 이유: groups.owner_id / assignments.created_by /
-- group_members.approved_by / reading_records.book_id 등은 on delete
-- cascade가 없어서, 참조되는 쪽(users, books)을 먼저 지우면 외래키 위반으로
-- 실패합니다. 참조하는 쪽부터 지웁니다.

begin;

-- 1) 아이 사진·음성 파일 (비공개 버킷 reading-media)
delete from storage.objects where bucket_id = 'reading-media';

-- 2) 독서기록과 책장 이름표 -- reading_records.group_id도 cascade가 없어서
--    그룹보다 먼저 지워야 한다(로컬 Postgres에서 순서를 바꿔보다 확인).
delete from public.reading_records;
delete from public.shelf_tags;

-- 3) 숙제 (assignment_books / assignment_missions / 응답은 cascade)
delete from public.assignments;

-- 4) 그룹 (group_members / book_lists / book_list_items는 cascade)
delete from public.groups;

-- 5) 아이 (child_guardians는 cascade)
delete from public.children;

-- 6) 책 카탈로그 (book_isbns / book_categories는 cascade)
delete from public.books;

-- 7) 사용자가 직접 추가한 질문만 삭제 (기본 제공 질문은 created_by가 null)
delete from public.book_questions where created_by is not null;

-- 8) 동의 이력
delete from public.consents;

-- 9) 계정 (public.users는 auth.users에 cascade)
delete from auth.users;

commit;
