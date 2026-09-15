-- 레거시 "유안이 독서기록" 앱의 Q_GENERIC(책 제목과 무관한 범용 질문 10개)을
-- 옮겨온다. 책마다 매칭된 Q_BOOK 딕셔너리는 가져오지 않기로 함(사용자 결정).
-- created_by가 null이면 기본 제공 질문, 값이 있으면 부모/교사/큐레이터
-- 누구든 직접 추가한 질문이다 -- 역할 구분 없이 로그인한 사용자면 누구나
-- 추가할 수 있다.
create table book_questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table book_questions enable row level security;

create policy "authenticated users read all questions"
on book_questions for select
to authenticated
using (true);

create policy "users add their own questions"
on book_questions for insert
to authenticated
with check (created_by = auth.uid());

create policy "users delete their own questions"
on book_questions for delete
to authenticated
using (created_by = auth.uid());

insert into book_questions (text, created_by) values
  ('가장 기억에 남는 장면은 뭐였어?', null),
  ('주인공은 왜 그렇게 했을까?', null),
  ('나라면 어떻게 했을까?', null),
  ('제일 웃겼던 부분은 어디야?', null),
  ('제일 신기했던 부분은 어디야?', null),
  ('이 책에서 새로 알게 된 건 뭐야?', null),
  ('누구에게 이 책을 읽어주고 싶어?', null),
  ('주인공한테 한마디 한다면?', null),
  ('뒷이야기를 만든다면 어떻게 될까?', null),
  ('표지만 봤을 땐 어떤 이야기일 것 같았어?', null);
