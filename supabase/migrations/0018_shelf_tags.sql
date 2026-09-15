-- 책장 정리(사용자 요청) -- "6살 책장", "여름방학 책장"처럼 부모가 직접
-- 이름 붙인 폴더/태그로 독서기록을 묶어볼 수 있게 한다. 그룹(학급/기관)
-- 기준 출처 필터와는 별개로, 부모가 자유롭게 정하는 분류다.

create table shelf_tags (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (child_id, name)
);

alter table reading_records
  add column shelf_tag_id uuid references shelf_tags(id) on delete set null;
-- 이름표를 지워도 그 이름표가 붙어있던 기록 자체는 지워지지 않고
-- 이름표만 떨어진다(on delete set null).

alter table shelf_tags enable row level security;

-- child_guardians 소유권 판정은 이미 public.is_child_guardian()로
-- 표준화돼 있다(마이그레이션 0002) -- 같은 함수를 그대로 재사용한다.
create policy "guardians manage shelf tags of own children"
on shelf_tags for all
using (public.is_child_guardian(child_id))
with check (public.is_child_guardian(child_id));
