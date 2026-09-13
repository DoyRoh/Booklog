-- 그룹을 지울 때 그 그룹으로 남긴 독서기록은 지우지 않고 group_id만 비운다.
-- 원래 FK에 on delete 동작이 없어서, 기록이 하나라도 있으면 숲지기가 앱에서
-- 그룹을 삭제할 수 없었다(외래키 위반). 기록은 아이의 것이니 남겨야 한다.
alter table public.reading_records
  drop constraint if exists reading_records_group_id_fkey;
alter table public.reading_records
  add constraint reading_records_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete set null;
