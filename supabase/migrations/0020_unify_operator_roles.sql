-- 선생님·기관·인플루언서를 "숲지기" 하나로 합친다.
--
-- 화면에서는 이미 구분을 없앴지만, RLS 정책 여러 곳(아이 이름 조회 0011,
-- 독서기록 조회 0002, 가입 승인 0002, 숙제·미션 관련 정책들)이
-- role in ('teacher','admin')만 허용해서 'curator'로 들어간 기존 운영진은
-- 아이들 상태를 볼 수 없다. 정책을 하나하나 고치는 대신 기존 curator
-- 멤버십을 teacher로 바꿔 두면 모든 정책이 그대로 똑같이 적용된다.
-- 새 그룹을 만들 때도 앱이 항상 'teacher'로 넣는다(app/recommend/create).
-- check 제약의 'curator' 값 자체는 남겨 둔다(과거 데이터·롤백 여지).
update group_members
   set role = 'teacher'
 where role = 'curator';

-- users.role의 'curator'도 같은 뜻으로 합친다(온보딩은 이제 'teacher'만 저장).
update users
   set role = 'teacher'
 where role = 'curator';
