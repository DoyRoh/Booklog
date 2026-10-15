-- 운영자가 "책숲 공식"(verified) 그룹의 추천도서 목록에 책을 넣는 함수.
--
-- 왜: 국립어린이청소년도서관 사서추천도서를 가져오는 운영 도구
-- (/api/admin/nlcy-import)는 운영자(byul890808@gmail.com) 세션으로 돈다.
-- 책 카탈로그(books/book_isbns)는 누구나 쓸 수 있지만, book_list_items는
-- 그 그룹 운영진만 쓸 수 있어서(0002) 운영자가 도서관 그룹의 운영진이 되지
-- 않고도(= 운영자 계정에 숲지기 프로필이 생기지 않고도) 넣을 길이 필요했다.
-- 서비스 롤 키나 도서관 계정 비밀번호를 서버에 두지 않으려고 이 방식을 쓴다.
-- 운영자 이메일 + verified 그룹일 때만 동작한다.

create or replace function public.admin_add_list_items(p_list uuid, p_books uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from auth.users u
    where u.id = auth.uid() and lower(u.email) = 'byul890808@gmail.com'
  ) then
    raise exception '운영자만 쓸 수 있어요.';
  end if;

  if not exists (
    select 1 from public.book_lists bl
    join public.groups g on g.id = bl.group_id
    where bl.id = p_list and g.verified
  ) then
    raise exception '책숲 공식 그룹의 목록이 아니에요.';
  end if;

  insert into public.book_list_items (book_list_id, book_id, required)
  select p_list, b, false from unnest(p_books) as b
  on conflict (book_list_id, book_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_add_list_items(uuid, uuid[]) from public, anon;
grant execute on function public.admin_add_list_items(uuid, uuid[]) to authenticated;
