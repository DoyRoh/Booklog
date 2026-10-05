-- 신고 확인·처리용 스크립트 (운영자 전용 — Supabase SQL Editor에서 실행)
-- SQL Editor는 RLS를 우회하므로 모든 사용자의 신고가 보인다.
-- 이 파일을 SQL Editor에 "Save as snippet"으로 저장해 두고 하루에 한 번 ①만 실행해 보면 된다.

-- ① 최근 신고 목록 — 무엇이, 누구 것이, 몇 번 신고됐는지
select
  to_char(r.created_at at time zone 'Asia/Seoul', 'MM-DD HH24:MI') as 신고시각_한국,
  case r.target_type when 'group' then '그룹' else '질문' end as 종류,
  coalesce(g.name, q.text)                        as 내용,
  coalesce(go.email, qo.email)                    as 만든사람,
  r.reason                                        as 신고이유,
  ru.email                                        as 신고한사람,
  count(*) over (partition by r.target_type, r.target_id) as 같은대상_신고수,
  r.target_id                                     as 대상_id
from content_reports r
left join groups g          on r.target_type = 'group'    and g.id = r.target_id
left join users go          on go.id = g.owner_id
left join book_questions q  on r.target_type = 'question' and q.id = r.target_id
left join users qo          on qo.id = q.created_by
left join users ru          on ru.id = r.reporter_id
order by r.created_at desc
limit 100;

-- ② 처리 — 문제가 있으면 아래 중 하나의 주석(--)을 풀고 id를 바꿔 실행한다.

-- 질문 지우기 (질문 은행에서 사라짐)
-- delete from book_questions where id = '대상_id';

-- 그룹 지우기 (추천도서·숙제·그룹원 목록이 함께 지워지고, 아이들 독서기록은 남음)
-- delete from groups where id = '대상_id';

-- 계정 정지(로그인 차단) — Supabase 대시보드 Authentication → Users → 그 사람 → Ban user가 더 쉽다.
-- update auth.users set banned_until = '2999-01-01' where email = '만든사람@example.com';

-- ③ 처리한 신고 정리 (선택) — 같은 대상의 신고를 목록에서 지운다
-- delete from content_reports where target_id = '대상_id';
