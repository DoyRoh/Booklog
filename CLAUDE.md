# 책숲 — Claude Code MASTER PROMPT

> 이 문서를 Claude Code의 첫 메시지로 붙여넣거나, 프로젝트 루트에 `CLAUDE.md`로 저장하세요.
> 아래 "지금 해야 할 일"은 **Phase 0에 한정**됩니다. Phase 1 이후는 이 문서 하단에 로드맵으로만
> 제공되며, 지금 구현하지 않습니다.

---

## 🎯 지금 해야 할 일 (Phase 0 — 기술 기반 구축)

다음을 순서대로 진행하고, **끝나면 요약 보고 후 멈추세요.** 사용자가 실제로 테스트해본 뒤 다음 지시를 줄 때까지 Phase 1로 넘어가지 마세요.

1. Next.js(App Router) + TypeScript 프로젝트 생성, PWA 설정
2. Supabase 프로젝트 연결 (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
3. 아래 "데이터베이스 스키마" 전체를 `supabase/migrations`에 마이그레이션으로 작성 및 적용
4. 아래 "RLS 정책" 패턴을 모든 테이블에 적용 (최소 `children`, `child_guardians`, `reading_records`, `groups`, `group_members`는 필수, 나머지도 동일 패턴으로 확장)
5. Supabase Auth 이메일 로그인 동작 확인
6. 아래 "디자인 토큰"을 `styles/globals.css`에 적용
7. 하단 5탭(오늘/책장/기록/추천/더보기) 레이아웃 뼈대만 구현 (내용 없이 빈 화면이어도 무방)
8. `.env.example`, README에 로컬 실행 방법 기록

### Phase 0 완료 기준 (Definition of Done)
- [ ] `npm run dev`로 로컬 실행 시 5탭 하단 네비게이션이 렌더링됨
- [ ] Supabase에 위 스키마 테이블이 전부 생성되어 있음 (마이그레이션 파일로 관리)
- [ ] 서로 다른 역할(부모 A / 부모 B / 교사)의 테스트 계정으로 RLS가 의도대로 막고 여는지 최소 1회 수동 검증
- [ ] 이메일 회원가입 → 로그인 → 로그아웃이 실제로 동작
- [ ] 디자인 토큰이 적용되어 배경색이 흰색이 아니라 `--paper`(#EAF0E5, 세이지 그린)로 보임

---

## 프로젝트 개요

**책숲** — 아이의 독서를 부모·교사, 그리고 책을 추천하는 기관·크리에이터가 함께 기록하고 넓혀가는 어린이 독서 플랫폼. 기존 "유안이 독서기록" 개인용 웹앱(로컬 IndexedDB 기반, 책장/독서기록/HABA 100/배지/음성기록/PWA 구현됨)을 서비스형으로 확장하는 프로젝트입니다.

**핵심 목표**: 부모가 책 한 권을 최소 기록하는 데 5초 이내.

**세 가지 사용자 유형**:
- `parent` — 아이 독서 기록 (핵심 사용자)
- `teacher` — 학급형 폐쇄 그룹 운영, 승인 기반 가입, 추천도서·숙제 관리
- `curator` — 기관(도서관·서점·출판사)·인플루언서. 승인 없이 팔로우 가능한 공개 추천도서 리스트 발행. 숙제 기능 없음.

---

## 기술 스택

```text
Frontend         Next.js (App Router) / React / TypeScript
Backend          Supabase (PostgreSQL / Auth / Storage)
Hosting          Vercel
PWA              Next.js PWA (오프라인 큐잉 포함, Phase 3에서 본격 구현)
```

---

## 폴더 구조 (권장)

```text
/app
  /(auth)/login
  /(auth)/signup
  /onboarding
  /children
  /today          ← "오늘" 탭
  /library        ← "책장" 탭
  /records        ← "기록" 탭
  /recommend      ← "추천" 탭 (내 그룹 + 둘러보기)
  /more           ← "더보기" 탭
  /teacher        ← 교사 대시보드
  /curator        ← 큐레이터 대시보드
/components
  /ui             ← 버튼, 카드, 배지 등 디자인 시스템 프리미티브
  /icons          ← 커스텀 SVG 라인 아이콘 (이모지 금지, 아래 디자인 원칙 참고)
/lib
  /supabase       ← client, server, types
  /offline        ← IndexedDB 큐잉 로직 (Phase 3)
/styles
  globals.css     ← 디자인 토큰
/supabase
  /migrations
```

---

## 데이터베이스 스키마

```sql
-- ========== users ==========
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text not null check (role in ('parent','teacher','curator','admin')),
  created_at timestamptz not null default now()
);

-- ========== consents (개인정보 동의 이력) ==========
create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('terms_privacy','voice_recording')),
  agreed boolean not null,
  agreed_at timestamptz not null default now()
);

-- ========== children / child_guardians (다대다) ==========
create table children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date,
  profile_image text,
  created_at timestamptz not null default now()
);

create table child_guardians (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','guardian')),
  created_at timestamptz not null default now(),
  unique (child_id, user_id)
);

-- ========== groups ==========
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('kindergarten','school','library','family','community','creator')),
  join_policy text not null check (join_policy in ('approval','open')),
  owner_id uuid not null references users(id),
  invite_code text unique,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== group_members ==========
-- 🔧 스키마 보완: 계획서의 child_id 단일 컬럼으로는 teacher/curator 본인의
-- 멤버십(RLS 판단 기준)을 표현할 수 없어 user_id를 추가함.
-- role='member'  → child_id 채움 (부모가 자녀를 그룹에 등록)
-- role in ('teacher','admin','curator') → user_id 채움 (운영자 본인)
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null check (role in ('member','teacher','admin','curator')),
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references users(id),
  joined_at timestamptz,
  check (child_id is not null or user_id is not null)
);

-- ========== books / book_isbns ==========
create table books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  author text,
  illustrator text,
  publisher text,
  publish_date date,
  page_count int,
  cover_url text,
  introduction text,
  summary text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table book_isbns (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  isbn text not null unique,
  edition text
);
-- 등록 로직: ISBN 스캔 → book_isbns UNIQUE 조회 → 있으면 재사용 / 없으면 신규 생성

-- ========== book_lists / book_list_items ==========
create table book_lists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  description text,
  target_age int,
  created_at timestamptz not null default now()
);

create table book_list_items (
  id uuid primary key default gen_random_uuid(),
  book_list_id uuid not null references book_lists(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  sort_order int,
  required boolean not null default false
);

-- ========== reading_records ==========
-- assignment_id 컬럼 없음: 숙제 완료 여부는 아래 뷰로 계산 (다대다 문제 해결)
create table reading_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  book_id uuid not null references books(id),
  group_id uuid references groups(id),
  read_date date not null default current_date,
  rating int check (rating between 1 and 5),
  emotion text,
  favorite boolean not null default false,
  transcript text,
  voice_url text,
  photo_url text,
  parent_memo text,
  sync_status text not null default 'synced' check (sync_status in ('pending_sync','synced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== assignments (학급형 그룹 전용) ==========
create table assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  title text not null,
  description text,
  start_date date,
  end_date date,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table assignment_books (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  book_id uuid not null references books(id),
  required boolean not null default true
);

create table assignment_missions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  type text not null check (type in ('read','question','voice','drawing','photo')),
  question text,
  required boolean not null default true
);
-- MVP는 type in ('read','question','voice')까지만 UI 구현

-- ========== 숙제 완료 여부 뷰 ==========
create view assignment_completion as
select
  am.id as assignment_id,
  ab.book_id,
  gm.child_id,
  exists (
    select 1 from reading_records rr
    where rr.child_id = gm.child_id and rr.book_id = ab.book_id
  ) as completed
from assignment_books ab
join assignments am on am.id = ab.assignment_id
join group_members gm on gm.group_id = am.group_id
  and gm.status = 'approved' and gm.child_id is not null;
```

---

## RLS 정책 (패턴 예시 — 모든 테이블에 동일 원칙 확장 적용)

```sql
alter table children enable row level security;
alter table child_guardians enable row level security;
alter table reading_records enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

-- children: 보호자 본인만 조회/수정
create policy "guardians select own children"
on children for select
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = children.id and cg.user_id = auth.uid()
));

create policy "guardians update own children"
on children for update
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = children.id and cg.user_id = auth.uid()
));

-- child_guardians: 본인 연결만
create policy "users manage own guardian links"
on child_guardians for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- reading_records: 보호자는 전체 CRUD
create policy "guardians manage own child's records"
on reading_records for all
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = reading_records.child_id and cg.user_id = auth.uid()
))
with check (exists (
  select 1 from child_guardians cg
  where cg.child_id = reading_records.child_id and cg.user_id = auth.uid()
));

-- reading_records: 교사는 민감 컬럼 제외하고 조회만 (그룹 소속 확인)
-- ⚠️ Supabase(Postgres 15+)에서는 view에 security_invoker=true를 설정해야
--    호출자 권한으로 RLS가 적용됩니다. 버전 확인 후 적용하거나, 대안으로
--    RPC 함수(security definer + 내부 권한 체크)로 구현하세요.
create view teacher_reading_view
with (security_invoker = true) as
select id, child_id, book_id, group_id, read_date, rating, emotion, favorite, transcript, created_at
from reading_records;

create policy "teachers view records of their approved group"
on reading_records for select
using (exists (
  select 1 from group_members gm
  where gm.group_id = reading_records.group_id
    and gm.user_id = auth.uid()
    and gm.role = 'teacher'
    and gm.status = 'approved'
));
-- 위 정책은 reading_records 테이블에 직접 걸리므로, 앱에서는 teacher_reading_view를
-- 통해서만 교사 화면에 노출하고 photo_url/voice_url/parent_memo는 화면에서 제외할 것

-- groups: open형은 전체 공개, approval형은 소속자만
create policy "open groups are publicly visible"
on groups for select
using (join_policy = 'open');

create policy "approval groups visible to approved members"
on groups for select
using (
  join_policy = 'approval'
  and exists (
    select 1 from group_members gm
    where gm.group_id = groups.id
      and gm.status = 'approved'
      and (gm.user_id = auth.uid() or exists (
        select 1 from child_guardians cg
        where cg.child_id = gm.child_id and cg.user_id = auth.uid()
      ))
  )
);

-- group_members: 가입 신청 — approval형은 pending, open형은 즉시 approved
create policy "users can request to join approval groups"
on group_members for insert
with check (
  status = 'pending'
  and exists (select 1 from groups g where g.id = group_id and g.join_policy = 'approval')
);

create policy "users can follow open groups immediately"
on group_members for insert
with check (
  status = 'approved'
  and exists (select 1 from groups g where g.id = group_id and g.join_policy = 'open')
);

create policy "teachers approve members of their group"
on group_members for update
using (exists (
  select 1 from group_members gm
  where gm.group_id = group_members.group_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin')
    and gm.status = 'approved'
));
```

> 나머지 테이블(`books`, `book_isbns`, `book_lists`, `assignments` 등)도 위와 같은 원칙 — **"본인 소유 또는 소속 그룹만 접근"** — 으로 RLS를 작성하고, Phase 0 완료 기준의 수동 검증 단계에서 실제로 테스트하세요.

---

## 디자인 원칙 (책숲 디자인 컨셉 & 비주얼 가이드 V1)

> 이 섹션은 V1.2 계획서의 13번 섹션(디자인 원칙)과 MASTER PROMPT의 기존 "디자인 토큰" 블록을
> 대체합니다. 색상 팔레트가 자두색(`#4A4363`)에서 세이지 그린(`#EAF0E5`) 기반으로 교체되었습니다.

### 세계관 한 줄

> **끝없이 넓은 책숲, 정답 없는 길을 자유롭게 헤매며 탐험하고 발견하고 즐기는 여정**

아이는 이 숲의 여행자다. 정해진 커리큘럼을 "완수"하는 게 아니라, 자기만의 속도로 숲을 거닐며 책을 만나는 느낌을 준다. 부모·교사·큐레이터는 이 숲을 함께 걷는 조력자들이다.

### 핵심 오브젝트: 독서통장 → 🧭 탐험 수첩

기존 앱의 "독서통장(통장+도장)"이 가진 손맛(책 읽을 때마다 도장 쾅 찍는 즉각적 쾌감)은 그대로 유지하되, 오브젝트를 **탐험가의 낡은 가죽 수첩/여권**으로 재해석합니다.

- 책을 다 읽으면 수첩에 도장이 하나 찍힌다 — 이 도장은 **아이가 고른 아바타의 발자국 모양**(토끼/강아지/고양이 발자국)이다. 아바타 선택이 곧 "내 도장 디자인"이 되므로, 아이가 자기 캐릭터에 애착을 갖게 된다.
- "32번째 책!" 피드백은 → **"32번째 발자국을 남겼어요!"** 같은 문구로 자연스럽게 이어진다.
- 페이지를 넘기면 지금까지 남긴 발자국들이 쭉 이어진 "나만의 탐험로"처럼 보인다 (기존 독서통장의 "기록 나열" UX 구조는 그대로 재사용 가능 — 디자인만 리스킨).

### 그룹 진행률: 🗺️ 숲 지도

기존에 "32/100" 같은 숫자·체크리스트로 보여주던 그룹 추천도서 진행률은, **함께 밝혀나가는 숲 지도**로 바꿉니다.

- 학급 전체가 함께 채워가는 지도이므로 "우리 반이 같이 숲을 밝히고 있다"는 공동체감을 준다.
- 구현 난이도상 V1은 단순한 진행률 바 + 나무 아이콘 개수로 시작하고, 정교한 지도 일러스트는 V2로 미뤄도 무방 (범위 관리).
- 리스트 자체(어떤 책을 읽었는지)는 여전히 텍스트/카드로 병행 제공 — 지도는 "한눈에 보는 성취감" 용도, 실용적 탐색은 기존 리스트 UI 유지.

### 캐릭터 시스템

| 역할 | 캐릭터 | 등장 위치 |
|---|---|---|
| 부모/아이 | 토끼 · 강아지 · 고양이 (아이가 선택) | 온보딩 아바타 선택, 프로필, 발자국 도장 모양 |
| 교사 | 등불 든 곰 | "오늘" 탭 헤더, 숙제 안내 문구 옆, 교사 대시보드 브랜딩 |
| 큐레이터 | 하얀 새 | 큐레이터 발행 리스트 옆 배지, 큐레이터 대시보드 브랜딩 |

**캐릭터가 하는 "역할 연기"**
- **곰 (교사)**: 숲에서 길을 밝혀주는 존재. 숙제/추천도서 안내 문구에 "곰이 등불로 다음 길을 비춰줘요" 같은 톤을 은은하게 녹인다. 승인 대기 알림도 "곰이 새 친구를 기다리고 있어요" 같은 부드러운 톤 가능 (실제 카피는 UX 카피 작업 시 확정).
- **하얀 새 (큐레이터)**: 숲 이곳저곳을 날아다니며 소식을 물어다주는 존재. 큐레이터가 새 추천도서를 올리면 "숲 저편에서 새가 책 소식을 물어왔어요" 톤으로 연결 가능.
- **토끼/강아지/고양이 (아이)**: 숲을 직접 탐험하는 주인공. 나머지 UI(표정 선택, 배지 등)에서 아이가 고른 동물이 계속 함께 등장해 일관된 애착을 형성.

### 컬러 시스템 (CSS 토큰)

```css
:root {
  /* 배경 — 차분한 색연필 질감의 세이지 그린 */
  --paper: #EAF0E5;
  --card: #FFFFFF;
  /* 텍스트 — 짙은 숲그림자색 */
  --ink: #26362B;
  --ink-2: #5C6B5F;
  --rule: #D9E3D3;
  /* 포인트 — 맑고 청명한 녹색 */
  --point: #2FA84F;
  --point-deep: #1B5E3A;   /* hover/눌림 상태 */
  /* 보조 강조 — 곰의 등불(따뜻한 호박색), 배지·CTA에 사용 */
  --lantern: #E8A33D;
  /* 포인트 강조 서브 — 숲속 열매/버섯 (기존 레드 계승, 사용 빈도는 낮춤) */
  --berry: #D94A32;
  --r: 22px;
  --disp: "Gowun Dodum", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  --hand: "Gamja Flower", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}
```

**사용 가이드**
- `--point`(녹색)는 주요 버튼, 선택 상태, 진행률 등 가장 자주 쓰는 강조색
- `--lantern`(호박색)은 "지금 주목해야 할 것" — 오늘의 숙제, 알림 배지 등
- `--berry`(레드)는 정말 드물게 — 예: 특별 배지, 마감 임박 경고 정도로 절제해서 사용
- 배경은 흰색이 아니라 항상 `--paper`(세이지 그린 종이톤)를 기본으로

### 아이콘·일러스트 원칙 (기존 금지사항 유지)

```text
❌ AI 생성 이모지/이모티콘 스타일 클립아트 세트 사용 금지
❌ 유니코드 이모지를 UI 요소로 사용 금지
❌ 저작권 불분명한 외부 캐릭터 사용 금지
```

→ 곰·토끼·강아지·고양이·하얀 새 캐릭터를 포함한 모든 그래픽은 배경과 동일한 **색연필 질감의 커스텀 오리지널 일러스트**로 제작합니다. 기존 원칙(stroke 기반 라인 아이콘)과 캐릭터 일러스트는 함께 어우러지도록, 라인 아이콘도 손그림 느낌의 살짝 불규칙한 선(색연필 스케치 느낌)으로 통일하는 걸 권장합니다.

**V1 범위 제안**: 5종 캐릭터(곰/토끼/강아지/고양이/흰새) 각 1가지 기본 포즈만 우선 제작하고, 표정 변화·다양한 포즈는 V2 이후로 미룹니다. 발자국 도장 3종(토끼/강아지/고양이)은 간단한 실루엣 스탬프 형태로 시작해도 충분합니다.

**핵심 모티프**: "탐험 수첩"(구 독서통장) 카드 — 발자국 도장 모티프로 읽은 책 수를 표시. 브랜드 정체성이므로 반드시 유지.

**아이 화면**: 배지·도장·블롭 모티프를 부모 화면보다 크고 자주 노출, 터치 영역을 아이 손가락 기준으로 크게. 채도 높은 카테고리 색상 팔레트 사용 가능. 단, "유치원 앱처럼 보이지 않는" 세련됨은 유지.

**부모 화면**: 정보 밀도 높게, 검색/필터 편리하게, 불필요한 장식 제거.

**디자인 목표**: *"유치원 앱처럼 보이지 않지만, 아이가 만졌을 때 확실히 반가운 서비스"*

### 화면별 적용 요약

```text
온보딩         아바타 선택 화면 (토끼/강아지/고양이 중 하나 고르기) — Phase 1
오늘 탭        곰+등불 헤더 일러스트, 숙제 안내에 은은하게 세계관 반영
책장/기록      "탐험 수첩" — 발자국 도장 UI (아바타별 발자국 모양)
추천 탭        내 그룹(학급형)은 곰 배지, 팔로우 중인 기관/크리에이터는 흰새 배지
               그룹 진행률은 텍스트 리스트 + 간단한 숲 지도(진행률 바) 병행
교사 대시보드   곰 캐릭터 브랜딩
큐레이터 대시보드  흰새 캐릭터 브랜딩
```

### Phase 1 이후 반영 필요 (지금 구현하지 않음)

- Phase 1(온보딩) 범위에 "아바타 선택 화면" 추가
- 데이터베이스 스키마에 `children.avatar` 컬럼(`rabbit | dog | cat`) 추가 — Phase 1 구현 시 마이그레이션으로 함께 반영
- 곰/토끼/강아지/고양이/흰새 캐릭터 일러스트, 발자국 도장 3종, 숲 지도 시각화 — 해당 기능이 실제로 만들어지는 Phase(3~6)에서 함께 제작

---

## 화면 구조 (하단 5탭 — Phase 0에서는 뼈대만)

```text
오늘 │ 책장 │ 기록 │ 추천 │ 더보기
```

- 오늘: 숙제 + 오늘 읽을 책 (Phase 5)
- 책장: 읽은 책 (Phase 3)
- 기록: 독서기록 (Phase 3)
- 추천: 내 그룹(학급+기관+크리에이터) / 둘러보기(Phase 4)
- 더보기: 프로필/그룹/설정

---

## 전체 로드맵 (컨텍스트용 — 지금 만들지 않음)

```text
Phase 0  기술 기반 구축 (RLS 포함)                    ← 지금 여기
Phase 1  회원 + 아이 프로필 (가입유형 선택, 통합 개인정보 동의)
Phase 2  책 DB + 바코드 검색 + 중복 방지
Phase 3  독서기록 + 오프라인 큐잉(IndexedDB) + 음성 보관정책
Phase 4  그룹 + 추천도서 (approval/open 이원화, 탐색 화면)
Phase 5  독서숙제 (학급형 전용, 자동완료 뷰 기반)
Phase 6  교사 대시보드 + 큐레이터 대시보드
Phase 7  AI (STT, 독서기록 요약, 성향 분석, 맞춤 추천) — V2 이후
```

각 Phase는 이전 Phase가 실제로 테스트 완료된 뒤에만 시작합니다.

---

## 절대 하지 않을 것

```text
❌ SNS  ❌ 댓글  ❌ 친구 기능  ❌ 채팅  ❌ 결제  ❌ 광고
❌ AI 독후감 자동 작성  ❌ AI 그림 분석  ❌ 게임화 과도 추가
❌ 복잡한 기관 ERP 기능  ❌ 큐레이터 정식 인증 심사 플로우
❌ Phase 0 범위를 벗어난 화면/기능 구현 (지금은 뼈대만)
```

---

## 개발 원칙

- Phase 단위로 끊어서 진행. 한 번에 전체 앱을 만들지 않는다.
- 각 Phase 종료 시 요약 보고 후 반드시 멈추고 사용자 테스트를 기다린다.
- RLS는 "일단 코드로 막고 나중에 DB로 막기"가 아니라 **처음부터 DB 레벨에서 강제**한다.
- 이모지·AI 클립아트 아이콘은 코드 어디에도 사용하지 않는다.

---

## Phase 0 구현 참고사항 (2026-08-17 커밋 기준)

- `users.id`는 `auth.users(id)`를 참조하며, `on_auth_user_created` 트리거가 회원가입 시 `public.users` 행을 자동 생성합니다(`role` 기본값 `parent`).
- Next.js 16부터 `middleware.ts`가 `proxy.ts`로 이름이 바뀌었습니다(기능은 동일). 세션 쿠키 갱신 로직은 `proxy.ts`에 있습니다.
- `legacy/index.html`은 서비스형으로 확장하기 전의 개인용 프로토타입으로, 디자인/아이콘 참고용으로만 보존되며 Next.js 빌드에는 포함되지 않습니다.
- `AGENTS.md`는 `next dev`/`next build`가 자동 생성하는 Next.js 16 관련 에이전트 안내이며, 이 파일 하단의 `@AGENTS.md` 참조를 통해 계속 포함됩니다.
- "디자인 컨셉 & 비주얼 가이드 V1" 반영으로 색상 토큰이 `--plum`/`--red`에서 `--point`/`--lantern`/`--berry`로 교체되었습니다. `app/globals.css`, `app/layout.tsx`(`themeColor`), `public/manifest.webmanifest`, `public/icon.svg`가 함께 갱신되었습니다.

## Phase 1 구현 참고사항

- `app/onboarding`에 역할 선택(부모/교사/큐레이터) → 약관 동의(`consents`) → 아이 등록(부모만, `children.avatar`에 토끼/강아지/고양이 저장)까지 이어지는 온보딩 마법사를 구현했습니다. 캐릭터 일러스트는 아직 없고 `components/icons/avatar-icons.tsx`의 stroke 라인 아이콘으로 임시 대체했습니다(정식 일러스트는 이후 Phase에서 제작).
- `users.onboarding_completed` 컬럼(기본값 `false`)으로 온보딩 완료 여부를 추적하며, `proxy.ts`가 이 값을 기준으로 라우팅을 강제합니다: 미로그인 상태로 탭 경로 접근 시 `/login`, 로그인은 했지만 온보딩 미완료 시 `/onboarding`, 온보딩 완료 후 `/login`·`/signup`·`/onboarding` 재방문 시 `/today`로 보냅니다.
- 온보딩에서 사용자가 자기 `role`을 저장할 수 있어야 하므로, `users` 테이블의 self-update RLS 정책을 `role in ('parent','teacher','curator')`로 제한했습니다(`admin`으로의 자기 승격 차단). 로컬 Postgres에서 실제로 우회 시도가 막히는지 검증했습니다.

@AGENTS.md
