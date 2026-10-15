-- 추천도서 책마다 추천 연령 구간(사용자 확정):
--   infant 0~3세 / preschool 4~7세(입학 전) / lower 저학년(1~3) / upper 고학년(4~6) / teen 청소년
-- 여러 개 고를 수 있고, null이면 "연령 미정"(아이 화면에서 흐리게 하지 않음).
--
-- 카탈로그(books)가 아니라 그룹 목록의 책(book_list_items)에 둔다 -- 같은 책도
-- 숲지기마다 판단이 다를 수 있고, 남의 판단을 덮어쓰면 안 되기 때문이다.
-- 그룹의 연령은 따로 저장하지 않고 이 값들로 그때그때 계산한다(분포).
-- 쓰기 권한은 기존 "operators manage book_list_items"(0002) 그대로.

alter table public.book_list_items
  add column if not exists age_bands text[];

alter table public.book_list_items
  drop constraint if exists book_list_items_age_bands_check;
alter table public.book_list_items
  add constraint book_list_items_age_bands_check
  check (age_bands is null or age_bands <@ array['infant','preschool','lower','upper','teen']::text[]);

-- 책숲 공식 그룹(official_keepers.sql, nlcy_keeper.sql)은 그룹 이름이 곧 연령이라 채워 둔다.
update public.book_list_items bli
set age_bands = v.bands
from public.book_lists bl
join public.groups g on g.id = bl.group_id
join (values
  ('처음 만나는 그림책 · 0~3세', array['infant']::text[]),
  ('함께 읽는 그림책 · 4~5세', array['preschool']::text[]),
  ('생각이 자라는 그림책 · 6~7세', array['preschool']::text[]),
  ('혼자 읽기 시작할 때 · 초등 1~2학년', array['lower']::text[]),
  ('사서추천도서 · 유아', array['preschool']::text[]),
  ('사서추천도서 · 초등 저학년', array['lower']::text[]),
  ('사서추천도서 · 초등 고학년', array['upper']::text[]),
  ('사서추천도서 · 청소년', array['teen']::text[])
) as v(group_name, bands) on v.group_name = g.name
where bli.book_list_id = bl.id
  and g.verified
  and bli.age_bands is null;

-- 사서추천도서 가져오기(운영자 세션)용: 0036과 같은 권한 검사, 책마다 연령을 함께 넣고
-- 이미 있는 책은 연령이 비어 있을 때만 채운다. 새로 넣은 수를 돌려준다.
-- p_items: [{"book_id": "...", "age_bands": ["lower"]}, ...]
create or replace function public.admin_add_list_items_with_age(p_list uuid, p_items jsonb)
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

  with src as (
    select (e->>'book_id')::uuid as book_id,
           nullif(array(select jsonb_array_elements_text(coalesce(e->'age_bands', '[]'::jsonb))), '{}') as bands
    from jsonb_array_elements(p_items) e
  )
  insert into public.book_list_items (book_list_id, book_id, required, age_bands)
  select p_list, book_id, false, bands from src
  on conflict (book_list_id, book_id) do nothing;
  get diagnostics v_count = row_count;

  update public.book_list_items bli
  set age_bands = s.bands
  from (
    select (e->>'book_id')::uuid as book_id,
           nullif(array(select jsonb_array_elements_text(coalesce(e->'age_bands', '[]'::jsonb))), '{}') as bands
    from jsonb_array_elements(p_items) e
  ) s
  where bli.book_list_id = p_list and bli.book_id = s.book_id
    and bli.age_bands is null and s.bands is not null;

  return v_count;
end;
$$;

revoke all on function public.admin_add_list_items_with_age(uuid, jsonb) from public, anon;
grant execute on function public.admin_add_list_items_with_age(uuid, jsonb) to authenticated;
