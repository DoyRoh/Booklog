-- 신고가 들어오면 운영자에게 바로 메일을 보낸다.
--
-- 앱 서버를 거치지 않고 DB 트리거가 직접 Resend(메일 발송 API)를 부른다(pg_net).
-- 키·받는 주소는 아무도 못 읽는 private.notify_config 한 줄에 넣는다 —
-- 이 파일(깃 저장소)에는 비밀값을 적지 않는다.
--
-- 설정 (한 번만):
--   1) https://resend.com 에 운영자 메일(예: byul890808@gmail.com)로 가입 → API Keys → Create → 키 복사
--      (도메인 인증 없이 보내는 기본 발신 주소 onboarding@resend.dev 는 "가입한 그 메일"로만
--       보낼 수 있다 — 그래서 받는 주소 = Resend 가입 메일이어야 한다.)
--   2) 이 파일을 SQL Editor에서 실행
--   3) 아래 한 줄을 키·메일만 바꿔 실행
--        insert into private.notify_config (resend_api_key, admin_email)
--        values ('re_여기에키', 'byul890808@gmail.com')
--        on conflict (id) do update
--          set resend_api_key = excluded.resend_api_key, admin_email = excluded.admin_email;
--   설정을 안 하면 트리거는 아무것도 안 한다(신고 접수는 그대로 됨).

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.notify_config (
  id int primary key default 1 check (id = 1),
  resend_api_key text,
  admin_email text,
  from_email text not null default 'onboarding@resend.dev'
);
revoke all on private.notify_config from public;

create or replace function private.notify_new_report()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  cfg private.notify_config%rowtype;
  v_kind text;
  v_content text;
  v_owner text;
  v_reporter text;
  v_count int;
begin
  select * into cfg from private.notify_config where id = 1;
  if not found or cfg.resend_api_key is null or cfg.admin_email is null then
    return new;
  end if;

  if new.target_type = 'group' then
    v_kind := '그룹';
    select g.name, u.email into v_content, v_owner
      from groups g left join users u on u.id = g.owner_id
     where g.id = new.target_id;
  else
    v_kind := '질문';
    select q.text, u.email into v_content, v_owner
      from book_questions q left join users u on u.id = q.created_by
     where q.id = new.target_id;
  end if;

  select email into v_reporter from users where id = new.reporter_id;
  select count(*) into v_count from content_reports
   where target_type = new.target_type and target_id = new.target_id;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cfg.resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', '책숲 신고 알림 <' || cfg.from_email || '>',
      'to', jsonb_build_array(cfg.admin_email),
      'subject', '[책숲] 새 신고 — ' || v_kind || ' "' || coalesce(left(v_content, 40), '(삭제됨)') || '"',
      'text',
        '새 신고가 들어왔어요. 24시간 안에 확인해 주세요.' || E'\n\n' ||
        '종류: ' || v_kind || E'\n' ||
        '내용: ' || coalesce(v_content, '(이미 삭제됨)') || E'\n' ||
        '만든 사람: ' || coalesce(v_owner, '-') || E'\n' ||
        '신고 이유: ' || coalesce(new.reason, '-') || E'\n' ||
        '신고한 사람: ' || coalesce(v_reporter, '-') || E'\n' ||
        '이 대상의 누적 신고: ' || v_count || '건' || E'\n' ||
        '대상 id: ' || new.target_id || E'\n\n' ||
        '처리: Supabase SQL Editor에서 supabase/admin/reports.sql 의 ② 쿼리에 대상 id를 넣어 실행하세요.' || E'\n' ||
        '문제가 없으면 아무것도 안 해도 돼요 — 신고한 사람 화면에서는 이미 숨겨져 있어요.'
    )
  );
  return new;
exception when others then
  -- 메일 발송이 어떤 이유로든 실패해도 신고 접수 자체는 막지 않는다.
  return new;
end;
$$;

drop trigger if exists content_reports_notify on content_reports;
create trigger content_reports_notify
  after insert on content_reports
  for each row execute function private.notify_new_report();
