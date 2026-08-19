-- 사진·음성 기록용 Storage 버킷. 아이 사진/목소리라 비공개(public=false)로
-- 만들고, 화면에는 항상 서명된 URL(만료시간 있음)로만 노출한다.
--
-- 경로 규칙: 모든 오브젝트 이름은 "{child_id}/..."로 시작한다. RLS는 이
-- 첫 폴더 세그먼트만으로 소유권을 판정하므로, 파일 종류는 뒤쪽 파일명으로
-- 구분한다.
--   {child_id}/photo-{uuid}.{ext}      독서기록 사진 (reading_records.photo_url)
--   {child_id}/voice-{uuid}.webm       독서기록 음성 메모 (reading_records.voice_url)
--   {child_id}/mission-{mission_id}.webm  낭독 미션 녹음 (assignment_mission_responses.voice_url)
insert into storage.buckets (id, name, public)
values ('reading-media', 'reading-media', false)
on conflict (id) do nothing;

-- reading_records와 동일한 원칙: 보호자는 자기 아이 폴더 전체를 CRUD.
create policy "guardians manage own child's reading media"
on storage.objects for all
using (
  bucket_id = 'reading-media'
  and exists (
    select 1 from child_guardians cg
    where cg.child_id = ((storage.foldername(name))[1])::uuid
      and cg.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'reading-media'
  and exists (
    select 1 from child_guardians cg
    where cg.child_id = ((storage.foldername(name))[1])::uuid
      and cg.user_id = auth.uid()
  )
);

-- assignment_mission_responses의 "teachers view group mission responses"
-- 정책과 동일한 원칙: 교사는 자기 그룹 아이의 낭독 미션 녹음만 조회 가능.
-- (사진·음성 메모는 teacher_reading_view가 애초에 photo_url/voice_url을
-- 빼고 노출하므로 교사가 접근할 경로 자체가 없다.)
create policy "teachers view group mission voice recordings"
on storage.objects for select
using (
  bucket_id = 'reading-media'
  and exists (
    select 1 from assignment_mission_responses amr
    join assignment_missions am on am.id = amr.mission_id
    join assignments a on a.id = am.assignment_id
    join group_members gm on gm.group_id = a.group_id
    where amr.voice_url = storage.objects.name
      and gm.user_id = auth.uid()
      and gm.role in ('teacher', 'admin')
      and gm.status = 'approved'
  )
);
