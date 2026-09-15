-- 책숲 Phase 1 — 회원 + 아이 프로필
-- 1) 아이 아바타 컬럼 (디자인 V1: 발자국 도장 모양의 근거)
-- 2) 온보딩 완료 여부 플래그 (역할 선택 + 약관 동의 + 아이 등록을 마쳤는지)
-- 3) users 테이블 self-update 정책을 role 값 제한으로 강화

alter table children
  add column avatar text check (avatar in ('rabbit', 'dog', 'cat'));

alter table users
  add column onboarding_completed boolean not null default false;

-- 기존 "users update own row" 정책은 role 값에 제한이 없어서, 로그인한
-- 사용자가 자기 role을 'admin'으로 직접 바꿔치기할 수 있는 권한 상승 구멍이
-- 있었다. 온보딩 화면에서 본인이 고를 수 있는 값(parent/teacher/curator)만
-- 허용하도록 좁힌다. admin 지정은 앱을 통해서가 아니라 Supabase 대시보드에서
-- 직접 처리한다.
drop policy "users update own row" on users;

create policy "users update own row"
on users for update
using (id = auth.uid())
with check (id = auth.uid() and role in ('parent', 'teacher', 'curator'));
