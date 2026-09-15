-- 선생님/기관 프로필(그룹 운영진)도 아이처럼 캐릭터 얼굴을 고를 수 있게
-- 한다 -- 곰(등불을 든 길잡이) 또는 백로(소식을 물어오는 새). 운영 프로필은
-- 계정당 하나(여러 그룹을 운영해도 사람은 한 명)라 users에 둔다.
-- 기존 "users update own row" 정책은 id = auth.uid()만 확인하므로 이 컬럼도
-- 본인만 바꿀 수 있다(추가 정책 불필요).
alter table users
  add column operator_avatar text
    check (operator_avatar in ('bear', 'egret'));
