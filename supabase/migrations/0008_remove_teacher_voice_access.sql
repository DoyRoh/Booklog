-- 0007에서 교사가 자기 그룹 아이의 낭독 미션 녹음을 들을 수 있게 했지만,
-- 재검토 결과 교사에게는 불필요한 개인정보 접근이라 다시 뺀다. 교사가
-- 실제로 필요한 건 "무엇을 언제 읽었는지"뿐이고, 이건 이미
-- assignment_completion 뷰(reading_records 존재 여부)로 충분히 판정된다.
-- 낭독 음성 자체는 부모만 접근 가능한 상태로 되돌린다(guardians 정책은
-- 그대로 유지, 이 정책만 제거).
drop policy if exists "teachers view group mission voice recordings" on storage.objects;
