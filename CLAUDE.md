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

**핵심 목표**: 부모가 책 한 권을 최소 기록하는 데 30초 이내.

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

**일러스트 방향성 레퍼런스** (사용자가 무드보드로 제공, 실제 캐릭터 제작 Phase에서 참고): 세이지그린 들판 위로 흰 새(백로) 무리가 나는 항공뷰 — 진한 그림자와 밝은 초록의 대비가 뚜렷함. 곰이 등불을 들고 토끼·강아지·고양이와 함께 별이 뜬 밤 숲길을 걷는 구도 — 이게 "책숲" 세계관을 가장 잘 압축해서 보여주는 장면. 색연필 질감으로 곰·토끼·다람쥐가 숲길을 나란히 걷는 그림. **주의**: 참고 이미지 중 일부는 특정 작가의 저작물(서명 확인됨)이라 그대로 사용하거나 근접 모작하면 안 되며, 톤·구도·색감만 참고해 새로 제작해야 함(디자인 원칙의 "저작권 불분명한 외부 캐릭터 사용 금지"와 동일한 이유).

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
❌ 아이 간 비교·경쟁 (순위, 리더보드, 다른 아이와의 독서량 비교 등)
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

## Phase 2 구현 참고사항

- `app/library/add`에 바코드 스캔(`components/barcode-scanner.tsx`, `@zxing/browser`, EAN-13/EAN-8) 또는 ISBN 직접 입력 → 카카오 책 검색 API 조회(`app/api/books/lookup/route.ts`, `KAKAO_REST_API_KEY`는 서버 전용) → 미리보기 → `books`/`book_isbns` 저장 흐름을 구현했습니다. `book_isbns`에 이미 있는 ISBN이면 카카오 API를 부르지 않고 기존 책 정보를 바로 보여줍니다(중복 방지). `books`/`book_isbns`는 인증된 사용자 전체가 읽고 쓰는 공유 카탈로그라 RLS의 `guardians select own children` 같은 소유권 검사가 없고, Phase 0 때 겪었던 "INSERT 직후 RETURNING이 RLS에 막히는" 문제도 여기선 발생하지 않습니다(SELECT 정책이 `to authenticated using(true)`라 누구나 즉시 조회 가능).
- **Phase 4에 반영 필요** (교사가 추천도서 목록을 올릴 때): 지금 카카오 조회는 `target=isbn`으로 ISBN 전용이지만, 교사는 책을 손에 들고 바코드를 하나씩 찍기보다 **책 제목으로 검색**해서 여러 권을 목록에 올리는 흐름이 필요합니다. 카카오 책 검색 API는 `target` 파라미터를 빼면 제목/저자 키워드 검색도 지원하므로, `/api/books/lookup`을 확장하거나 별도 라우트로 "제목 검색 → 후보(표지 여러 개) 목록 → 선택" UI를 Phase 4에서 만들어야 합니다. 카카오 DB에 없는 책(절판·독립출판 등)도 있을 수 있으므로, 검색 결과 없음 → 수동 입력(제목/저자 직접 타이핑) 경로도 함께 필요합니다.

## Phase 3 구현 참고사항

- **다자녀 지원**: `users.active_child_id`(마이그레이션 0004)로 "지금 보고 있는 아이"를 추적합니다. `lib/active-child.ts`의 `getActiveChild()`가 이 값을 우선 쓰고, 없으면 `child_guardians`에서 가장 먼저 등록한 아이로 대체합니다. 더보기 탭(`components/child-switcher.tsx`)에서 아이 카드를 탭해 전환하거나 "+ 아이 추가"로 둘째·셋째를 등록할 수 있습니다. `users` self-update RLS 정책에 `active_child_id`가 실제 본인이 보호자인 아이인지 확인하는 조건을 추가해, 다른 부모의 아이 ID로 바꿔치기하는 걸 막았습니다(로컬 Postgres에서 실제로 차단되는지 확인).
- **책 등록 = 독서기록 생성으로 통합**: Phase 2까지는 "책 등록"이 공유 카탈로그(`books`/`book_isbns`)에만 저장되고 `reading_records`와 연결되지 않아서, 등록해도 책장에 안 보이는 문제가 있었습니다(실사용 중 발견). `app/library/add`의 마지막 단계를 평점·기분·즐겨찾기·부모메모를 입력하는 "기록 남기기" 화면으로 바꾸고, 여기서 `reading_records`를 `active_child_id` 기준으로 생성하도록 고쳤습니다. 이미 카탈로그에 있는 책(중복 감지)도 같은 화면으로 이어져서 새 책 등록과 동일하게 기록이 남습니다.
- **책장/기록 탭**: `app/library`, `app/records`가 `getActiveChild()`로 아이를 정하고 `reading_records ⋈ books`를 그 아이 기준으로 조회해 각각 표지 그리드 / 상세 리스트로 보여줍니다. 아이가 없으면(교사·큐레이터 계정, 또는 온보딩 전) 안내 문구만 표시합니다.
- **아직 없는 것**: `reading_records.photo_url`/`voice_url`은 스키마에는 있지만 실제 업로드 UI·Supabase Storage 버킷 설정은 아직입니다(다음 단계).
- **ISBN 없이 등록**: `app/library/add`에 "ISBN 없이 제목만으로 등록" 경로를 추가했습니다(사용자 피드백). `book_isbns`는 필수가 아니라 선택 관계라, ISBN이 없으면 그 테이블엔 아무것도 안 남기고 `books.source`만 `'manual'`로 기록합니다.

## Phase 4 구현 참고사항

- **그룹/추천도서 RLS는 이미 Phase 0에 있었습니다**: `groups`/`group_members`/`book_lists`/`book_list_items`의 RLS 정책은 마이그레이션 0002에서 이미 완성돼 있었고 실제로 이번에 그대로 잘 동작했습니다. Phase 4는 주로 그 위에 화면(UI)을 얹는 작업이었습니다.
- **초대 코드 조회**: 승인제 그룹은 승인 전까지 일반 SELECT로 안 보이기 때문에(`group_join_policy()`와 같은 이유), 초대 코드로 그룹을 찾는 `find_group_by_invite_code()` 함수(마이그레이션 0005, SECURITY DEFINER)를 추가했습니다. 그룹 이름·유형만 반환하고 민감한 정보는 없습니다.
- **카카오 키워드 검색 추가**: `/api/books/lookup`이 이제 `?isbn=`(단일 결과, 기존 동작 그대로) 외에 `?query=`(제목/저자 키워드, 후보 여러 개 반환)도 지원합니다. `app/recommend/[groupId]`의 "책 추가"(`components/add-book-to-list.tsx`)가 이걸로 교사가 책을 손에 안 들고도 검색해서 추천도서 목록에 넣을 수 있게 합니다. 검색에 없는 책은 제목만으로 수동 등록하는 경로도 함께 있습니다.
- **책 추가에 바코드 스캔 / ISBN 입력 모드 추가**: 교사도 책을 손에 들고 있을 때가 있으므로, `add-book-to-list.tsx`에 제목 검색 외에 바코드 스캔(`BarcodeScanner` 재사용)과 ISBN 직접 입력 모드를 추가했습니다(부모 쪽 `app/library/add`와 동일한 방식). ISBN으로 조회할 땐 `book_isbns`에 이미 있는지 먼저 확인해 있으면 카카오 API를 부르지 않고, 조회/검색 결과 모두 동일한 후보 목록 UI와 `addCandidate()` 로직을 공유합니다.
- **그룹당 추천도서 목록은 1개**: `book_lists`/`book_list_items` 스키마는 그룹당 여러 목록을 지원하지만, 지금은 그룹 생성 시 "추천도서"라는 기본 목록 하나만 자동으로 만들고 그걸로 고정해서 씁니다. 여러 목록 관리(예: "이번 달 추천", "졸업 전 필독서")는 필요해지면 나중에 추가.
- **로컬 Postgres로 검증**: 승인제 그룹 생성 → 초대 코드 조회 → 가입 신청(pending) → 교사 승인 → 추천도서 노출까지 전체 흐름과, 승인 전/미가입 상태에서는 그룹·추천도서가 안 보이는 격리, 공개(open) 그룹은 팔로우 전에도 보이고 즉시 가입되는 것까지 실제 쿼리로 확인했습니다.

## 책장 개선 (Phase 4 이후, 사용자 요청)

- **책등/전면 보기 전환 + 검색**: `components/library-shelf.tsx`(클라이언트 컴포넌트)가 책장 탭에 검색창과 "전면"/"책등" 토글을 추가합니다. 검색은 클라이언트 사이드로 제목/작가 부분일치(대소문자 무시)만 하며, 서버 왕복이 없습니다(한 아이의 책장 규모에서는 충분). 책등 보기는 실제 표지 이미지 대신 제목 해시로 고정 배정한 색(세이지그린 숲 컨셉 팔레트 7색)의 세로 막대에 `writing-mode: vertical-rl`로 제목을 세로로 표시합니다 — 같은 책은 항상 같은 색으로 보입니다. 마지막 보기 모드는 `localStorage`에 저장해 다음 방문에도 유지됩니다.
- **발자국 카운트**: 책장 헤더에 "OO의 발자국 N개"로 표시해 디자인 가이드의 "탐험 수첩" 모티프를 문구/아이콘 수준에서 반영했습니다(`components/icons/misc-icons.tsx`의 `FootprintIcon`). 실제 아바타별 발자국 일러스트는 아직 없고 단일 스트로크 아이콘입니다.

## Phase 5 구현 참고사항

- **스키마는 이미 Phase 0에 있었지만 답변 저장소가 빠져 있었습니다**: `assignments`/`assignment_books`/`assignment_missions`와 그 RLS, `assignment_completion` 뷰(책 단위 완료 여부, `security_invoker=true`로 이미 안전하게 만들어져 있었음)는 마이그레이션 0001-0002에 이미 있었습니다. 하지만 `assignment_missions`의 `question`/`voice` 타입 미션에 대한 "아이의 답"을 저장할 테이블이 스키마에 없어서, 마이그레이션 0006(`assignment_mission_responses`)을 추가했습니다. `reading_records`(보호자 전체 CRUD)와 `teacher_reading_view`(교사는 조회만) 패턴을 그대로 따라 RLS를 작성했고, 로컬 Postgres에서 보호자 CRUD/교사 조회전용/타 부모 완전 차단을 모두 확인했습니다.
- **MVP 범위**: `read` 타입은 별도 UI 없이 `assignment_books`(필독서)로만 다루고, 완료 여부는 `assignment_completion` 뷰(해당 책의 `reading_records` 존재 여부)로 그대로 판정합니다. `question` 타입은 텍스트 답변 입력/저장/수정이 실제로 동작합니다. `voice` 타입은 처음엔 Storage 버킷이 없어 "준비 중" 안내만 떴지만, 아래 "사진·음성 업로드" 절에서 실제 녹음 기능이 붙었습니다.
- **"30초 기록" 목표를 살린 빠른 완료**: 오늘 탭에서 숙제 책 옆의 "다 읽었어요" 버튼은 평점/기분 없이 `reading_records`를 바로 생성합니다(`child_id`, `book_id`, `group_id`만). 나중에 기록 탭에서 채워 넣을 수 있습니다. 이건 정식 "책 등록" 플로우(`app/library/add`)와는 별개의 경량 경로입니다.
- **교사가 숙제 만들기**: `components/create-assignment.tsx`(그룹 상세 화면, 운영자 전용)에서 제목/설명/기간 + 그룹의 추천도서 목록 중 필독서 선택 + 선택적 미션(질문/낭독) 추가까지 한 화면에서 처리합니다. `assignments`/`assignment_books`/`assignment_missions`를 클라이언트 생성 UUID로 순서대로 insert합니다(Phase 0부터 지켜온 RLS RETURNING 회피 패턴).
- **오늘 탭**: `app/today/page.tsx`가 부모 역할일 때만 활성 숙제(오늘이 시작일~종료일 사이, 또는 기간 미설정)를 보여주고, 교사/큐레이터 역할이면 각자 대시보드로 안내합니다.

## Phase 6 구현 참고사항

- **교사 대시보드** (`app/teacher`): 역할이 `teacher`가 아니면 데이터 없이 안내 문구만 표시합니다. 운영 중인 그룹마다 승인된 멤버 수, 승인 대기 건수, 숙제별 완료 현황(`assignment_completion` 집계)을 보여줍니다. 그룹·숙제 수가 적은 MVP 규모를 가정하고 그룹당/숙제당 개별 쿼리(N+1)로 작성했습니다 — 그룹이 많아지면 집계 쿼리로 최적화가 필요합니다.
- **큐레이터 대시보드** (`app/curator`): 발행한 그룹마다 팔로워 수(승인된 `child_id` 멤버 수)와 추천도서 권수를 보여줍니다. 큐레이터는 숙제 기능이 없으므로(원래 기획 그대로) 완료 현황 같은 섹션은 없습니다.
- **더보기 탭 연결**: `profile.role`이 `teacher`/`curator`면 더보기 탭에 대시보드 링크가 뜨고, 오늘 탭도 같은 조건으로 대시보드로 안내합니다. `/teacher`·`/recommend/[groupId]` 등은 `proxy.ts`의 5탭 게이트 대상이 아니라 각 페이지가 자체적으로 로그인/역할 체크를 합니다(기존 탭 페이지들과 동일한 패턴).

## 사진·음성 업로드 (Phase 6 이후, 사용자 요청)

- **Storage 버킷**: 마이그레이션 0007이 비공개(`public=false`) 버킷 `reading-media`를 만듭니다. 오브젝트 이름은 항상 `{child_id}/...`로 시작하고, `storage.objects` RLS가 이 첫 폴더 세그먼트만으로 `child_guardians` 소유권을 판정합니다(`(storage.foldername(name))[1]::uuid`). 파일 종류는 파일명 접두사로 구분합니다 — `photo-{uuid}`(독서기록 사진), `voice-{uuid}`(독서기록 음성 메모), `mission-{mission_id}`(낭독 미션 녹음, 재녹음 시 upsert로 덮어씀).
- **비공개 + 서명된 URL**: 사진·음성이 실제 아이 것이라 공개 버킷 대신 매번 `createSignedUrl()`로 만료시간 있는 URL을 발급합니다(`lib/storage.ts`의 `getSignedMediaUrl`). 화면에 표시할 때마다 서버 컴포넌트에서 새로 서명하므로, 링크를 복사해 공유해도 오래가지 않습니다.
- **교사는 어떤 녹음에도 접근할 수 없습니다**: 처음엔 교사가 자기 그룹 아이의 낭독 미션 녹음만 들을 수 있게 별도 SELECT 정책을 뒀었지만(0007), 사용자 판단으로 다시 뺐습니다(0008) — 교사는 "무엇을 언제 읽었는지"만 알면 충분하고(`assignment_completion` 뷰로 이미 판정됨), 아이 목소리 녹음까지 들을 필요는 없다는 프라이버시 원칙입니다. 독서기록 사진/음성 메모도 `teacher_reading_view`가 애초에 그 컬럼을 빼고 노출하므로 교사가 접근할 경로 자체가 없습니다. 로컬 Postgres에서 storage.objects를 최소 스키마로 모킹해 보호자 CRUD/교사 완전 차단/타 부모 완전 차단을 모두 확인했습니다.
- **음성 녹음은 동의 게이트**: 온보딩에서 이미 수집하던 `consents.type='voice_recording'`(선택 항목)을 `lib/consent.ts`의 `hasVoiceConsent()`로 확인해, 동의 안 한 부모에게는 음성 녹음 UI 자체를 숨깁니다(사진은 동의 대상이 아니라 게이트 없음). 재동의를 바꾸는 화면은 아직 없습니다 — 온보딩 때 선택한 값이 계속 유지됩니다.
- **컴포넌트**: `components/photo-picker.tsx`(파일 입력 + 미리보기), `components/voice-recorder.tsx`(`MediaRecorder`로 마이크 녹음, `barcode-scanner.tsx`와 동일한 권한 요청 패턴)를 새로 만들고, `app/library/add`의 기록 단계와 `components/assignment-today.tsx`의 낭독 미션 양쪽에서 재사용합니다.

## 질문 은행 (Phase 6 이후, 사용자 요청)

- **AI 없이, 레거시 앱의 정적 질문 목록만 이식**: 이전에 "책에 해당하는 질문" 기능이 AI 호출인지 물어보셨는데, 확인해보니 레거시 앱(`legacy/index.html`)의 `Q_GENERIC`은 그냥 하드코딩된 범용 질문 10개(책 제목과 무관)였습니다. 그중 특정 아이 이름이 들어간 문항("유안이라면...")만 "나라면 어떻게 했을까?"로 일반화해서, 마이그레이션 0009로 `book_questions` 테이블에 시드 데이터로 넣었습니다. 책마다 매칭되는 `Q_BOOK` 딕셔너리는 가져오지 않기로 했습니다(사용자 결정). AI API 호출이 전혀 없어 사용량과 무관하게 비용이 0원입니다.
- **역할 구분 없는 공용 질문 은행**: `book_questions`는 부모·교사·큐레이터 구분 없이 로그인한 사용자면 누구나 전체 조회·자기 질문 추가·자기 질문 삭제가 가능합니다(`created_by = auth.uid()`만 확인, role 체크 없음). 지금은 부모(책 등록 화면)와 교사(숙제 만들기 화면) 두 곳에 실제 UI가 있고, 큐레이터가 쓸 수 있는 화면은 아직 없습니다 — 큐레이터는 애초에 개별 책 상세 화면이나 숙제 기능이 없어서, 붙일 자리가 생기면 나중에 추가하면 됩니다.
- **책 등록 화면**: `components/question-prompt.tsx`가 기록 단계에서 질문 은행 중 하나를 무작위로 보여주고("오늘의 질문"), "다른 질문"으로 다시 뽑거나 "+ 질문 추가"로 새 질문을 은행에 보탤 수 있습니다. 답변을 저장하는 별도 필드는 없고, 어디까지나 부모 메모 textarea를 채울 때 영감을 주는 프롬프트입니다(레거시 앱의 원래 동작과 동일).
- **숙제 만들기 화면**: `components/create-assignment.tsx`의 질문 미션 입력 아래에 질문 은행 전체가 칩(chip) 형태로 뜨고, 클릭하면 그 텍스트로 채워집니다. 교사가 은행에 없는 질문을 직접 타이핑해서 숙제를 만들면, 저장 시점에 그 질문을 조용히 `book_questions`에 추가합니다(실패해도 숙제 생성 자체는 막지 않는 best-effort 처리) — 다음번엔 다른 교사도 그 질문을 칩으로 바로 쓸 수 있습니다.

## 책 상태 (읽고 싶어요 / 읽는 중 / 다 읽음) — 사용자 요청

- **스키마**: 마이그레이션 0010이 `reading_records.status`(`want`/`reading`/`done`, 기본값 `done`)를 추가합니다. 기존 행은 전부 "책 등록 = 다 읽고 기록" 흐름으로 만들어졌으니 기본값을 `done`으로 둬서 과거 데이터의 의미가 그대로 유지됩니다. 별도 RLS는 필요 없었습니다 — `reading_records`의 기존 "guardians manage own child's records"(FOR ALL) 정책이 이미 UPDATE까지 커버합니다.
- **숙제 완료 판정 버그를 미리 막음**: `assignment_completion` 뷰가 원래는 `reading_records` 존재 여부만 봤는데, 그대로 두면 "읽고 싶어요"만 눌러도 숙제 완료로 잘못 잡힙니다. 뷰에 `rr.status = 'done'` 조건을 추가해서 실제로 다 읽은 것만 완료로 치도록 고쳤습니다. 로컬 Postgres에서 want→reading→done으로 상태를 바꿔가며 completed 값이 그때그때 맞게 바뀌는지 확인했습니다.
- **책 등록 화면**: `app/library/add`의 기록 단계 맨 위에 "지금 상태" 3버튼(읽고 싶어요/읽는 중이에요/다 읽었어요, 기본값 다 읽었어요)이 뜹니다. "다 읽었어요"가 아니면 평점·기분·즐겨찾기·오늘의 질문 섹션을 숨깁니다(아직 안 읽었거나 읽는 중인 책에 대해 "재미있었나요"를 묻는 건 앞뒤가 안 맞아서). 사진·음성·메모는 상태와 무관하게 계속 선택 가능합니다. 저장 버튼 문구도 상태별로 다르게 표시됩니다("읽고 싶은 책으로 저장" 등).
- **기록 탭에서 상태 바꾸기**: 처음엔 각 기록 카드에 3버튼 세그먼트 컨트롤(`record-status.tsx`)을 바로 붙였지만, 실사용 피드백("기록 수정도 되게 해줘")을 반영해 클릭하면 뜨는 수정 모달(`record-edit-modal.tsx`) 안으로 통합했습니다 — 상태만 따로 바꾸는 버튼 대신, 카드를 누르면 상태·평점·기분·즐겨찾기·메모를 한 화면에서 같이 고칠 수 있습니다. `record-status.tsx`는 이제 안 쓰여서 지웠고, `ReadingStatus` 타입만 `lib/reading-status.ts`로 옮겼습니다.
- **책장 탭**: `components/library-shelf.tsx`에 전체/읽고 싶어요/읽는 중/다 읽음 필터 칩을 추가했고, 검색·책등·전면 보기와 함께 조합됩니다. "다 읽음"이 아닌 책은 표지 카드에 작은 배지로 상태가 표시됩니다(다 읽은 책이 기본/다수 상태라 배지 없이 두고, 예외 상태만 강조). "OO의 발자국 N개" 카운트는 `status='done'`인 책만 세도록 고쳤습니다 — 안 그러면 위시리스트에 담기만 해도 발자국이 늘어나는 게 이상하니까요.

## 레거시 앱 대조 점검 (실사용 피드백 반영)

사용자가 실제로 써보고 레거시 "유안이 독서기록" 웹앱과 비교하며 준 피드백을 반영했습니다. 대부분 "레거시엔 있는데 책숲엔 없던" 기능을 채우는 작업이었습니다.

- **버그 발견**: `children` 테이블에 교사/운영자용 SELECT 정책이 아예 없었습니다(`children` 조회 정책은 "guardians select own children" 하나뿐). 교사가 `group_members(children(name))`처럼 임베드로 아이 이름을 조회하면 PostgREST가 `children` 자체의 RLS도 따로 검사하기 때문에, 조용히 빈 값이 돌아와 승인 대기 목록에 아이 이름이 안 뜨는 문제가 있었습니다(화면엔 에러 없이 그냥 이름이 비어 보였을 것). 마이그레이션 0011로 "그 그룹 운영진이면 아이가 pending이든 approved든 이름을 볼 수 있다"는 정책을 추가했고, 로컬 Postgres에서 교사는 보이고 무관한 부모는 안 보이는 것까지 확인했습니다.
- **기록 수정 기능이 아예 없었습니다**: 이전까지는 독서기록을 만들 수만 있고 나중에 고칠 방법이 없었습니다. `components/record-edit-modal.tsx`(상태·평점·기분·즐겨찾기·메모를 한 화면에서 수정, 하단에서 올라오는 모달)를 만들고, 책장 탭 카드 클릭·기록 탭 카드 클릭·오늘 탭 최근 기록 클릭 세 군데 모두에서 열리도록 재사용했습니다.
- **기록 탭 개편**: 검색(제목/작가)이 아예 없었던 걸 추가했고, 레거시의 `viewBank`처럼 월별로 묶어서 보여주고("2026년 8월 · N권") 상단에 총 권수·평균 평점 요약을 붙였습니다(`components/records-list.tsx`).
- **책장 탭 개편**: 카드가 클릭이 안 되던 문제를 고쳐 클릭하면 수정 모달이 열리도록 했고, 정렬(최신순/제목순/작가순) 드롭다운을 검색·상태 필터 옆에 추가했습니다.
- **오늘 탭에 요약 + 최근 기록 추가**: 레거시의 `viewHome`(읽은 책 총량·이번 달·최장 연속 스탯 + 최근 기록 리스트)을 참고해 숙제 섹션 위에 통계 카드를, 최근 기록을 아래에 추가했습니다(`components/recent-records.tsx`, 최근 5권, 클릭하면 수정 모달). 스탯 중 "최장 연속"은 `read_date`를 날짜별로 유니크하게 뽑아 연속 일수를 계산하는 방식으로, 레거시의 스트릭 계산 로직을 그대로 옮겼습니다.
- **배지 시스템**: 레거시엔 HABA 100·분야 데이터에 크게 의존하는 배지가 많았는데, 책숲엔 그 데이터 모델이 없어서 순수하게 `reading_records`만으로 계산 가능한 것들만 골라 옮겼습니다(권수 마일스톤 1~100권, 연속 기록, 다시 읽기, 사진/음성 수집). 새 테이블 없이 `lib/badges.ts`가 매번 즉석에서 계산합니다. 이모지 대신 리본 메달 모양 스트로크 아이콘 하나(`BadgeIcon`)로 통일하고 달성 여부는 색으로만 구분합니다 — 배지마다 다른 그림은 실제 일러스트 제작 시 추가. `/badges` 페이지를 새로 만들고 책장 탭 헤더의 "발자국 N개"에서 들어갈 수 있게 링크를 걸었습니다.
- **책 등록 흐름을 한 화면으로 통합**: 원래 "선택(스캔/ISBN/제목없이) → 스캔 또는 ISBN 입력 → 기록"으로 화면이 3번 바뀌었는데, 선택+입력 단계를 하나로 합쳐 "제목·저자 검색 / 바코드 스캔 / ISBN 입력" 모드 토글 하나로 만들었습니다(교사 쪽 `add-book-to-list.tsx`에서 이미 쓰던 패턴 재사용). 제목·저자 검색은 카카오 키워드 검색을 그대로 쓰는데, 지금까지 교사한테만 있던 기능을 부모도 쓸 수 있게 됐습니다. `기록` 탭에도 "책 기록하기" 진입 버튼을 추가해 책장 탭까지 안 가도 바로 등록할 수 있게 했습니다.
- **교사/큐레이터 전용 하단 내비게이션**: `components/bottom-nav.tsx`가 이제 로그인한 사용자의 역할을 클라이언트에서 확인해 탭 구성을 통째로 바꿉니다. 교사는 오늘/책장/기록 대신 **대시보드 · 아이 관리 · 숙제 · 그룹 · 더보기**, 큐레이터는 **대시보드 · 그룹 · 더보기**를 봅니다("숙제 목록"과 "속한 어린이 관리"에 초점을 맞춰 달라는 요청 반영). 새로 만든 페이지 두 개:
  - `/teacher/assignments` — 운영 중인 모든 그룹의 숙제를 그룹 구분 없이 한 목록으로(제목·기간·완료 X/Y), 기존 `/teacher` 대시보드의 그룹별 요약과 상호 보완.
  - `/teacher/children` — 운영 중인 모든 그룹의 승인된 아이들을 그룹별로 묶어서(이름·아바타·그 그룹 숙제 전체 기준 완료 X/Y), 위에서 고친 `children` RLS 덕분에 정상적으로 이름이 뜹니다.
  기본 탭은 부모 화면(오늘/책장/기록/추천/더보기)으로 시작하고, 역할 조회가 끝나면 교사/큐레이터 계정만 바뀝니다(깜빡임 방지).

## 하단 탭 개편 + 기록 흐름 리네이밍 (실사용 피드백 반영)

- **'더보기'를 하단 탭에서 뺐습니다**: 5탭 중 하나로 있던 '더보기'가 화면 하나를 통째로 차지하는 게 아깝다는 피드백(그리고 "배지는 어디서 보나"는 이전 피드백)을 같이 반영해, `components/top-bar.tsx`(신규)를 만들어 모든 화면 우측 상단에 항상 떠 있는 '더보기' 아이콘 링크로 옮겼습니다. `app/layout.tsx`가 `<TopBar />`를 `<BottomNav />`처럼 전역에 렌더링하고, `<main>`에 `pt-[44px]`를 더해 겹치지 않게 여백을 확보했습니다(로그인 등 인증 화면은 `BottomNav`와 동일한 `HIDDEN_PREFIXES`로 숨김). 그 빈자리에 부모 탭은 **배지**를 채워 넣어 최종 구성이 **오늘 · 책장 · 기록 · 추천 · 배지**가 됐습니다. 교사/큐레이터 탭에서는 '더보기'를 그냥 제거만 했습니다(배지는 아이 개인 성취라 교사/큐레이터에게는 의미가 없음). `/badges` 페이지는 이제 책장의 하위 화면이 아니라 대등한 탭이라, 있던 "← 책장" 백링크를 지우고 다른 탭들과 같은 헤더 스타일(제목 + 부제)로 맞췄습니다.
- **"책 등록"이라는 문구를 없앴습니다**: 기능상으로는 이미 검색→기록까지 한 화면(단계 전환만 있음)으로 합쳐져 있었는데도, 화면 제목이 계속 "책 등록"이라 부모 입장에선 "기록을 남기기 전에 책부터 등록해야 하나?"로 오해할 여지가 있었습니다(레거시 앱은 처음부터 "기록 저장하기" 하나였음). `app/library/add/page.tsx`의 제목을 "기록 남기기"로 바꾸고, `app/library/page.tsx`의 진입 버튼과 빈 책장 안내 문구도 "+ 기록 남기기"로 통일했습니다(기존에도 `기록` 탭 버튼은 "책 기록하기"였는데 책장 쪽만 "+ 책 등록"으로 따로 놀고 있었습니다). URL(`/library/add`)과 내부 컴포넌트/함수 이름은 바꾸지 않았습니다 — 사용자에게 보이는 문구만 정리한 것이라 라우팅에는 영향이 없습니다.
- **"더보기 탭"이라는 표현도 같이 정리**: '더보기'가 더 이상 탭이 아니므로, 오늘/책장/기록 탭의 안내 문구("더보기 탭에서 아이를 추가해 주세요" 등)에서 "탭"을 뺐습니다.

## 기록 남기기 = 검색 화면이 아니라 기록 화면 (실사용 피드백 반영)

레거시 앱은 "책 기록하기"를 누르면 곧장 기록장(제목 입력 + 날짜 + 몇 번 읽었는지 + 저장 버튼)이 뜨고, 책 제목은 그 기록장 안의 첫 번째 입력창일 뿐입니다. 책숲은 검색/스캔/ISBN 중 하나를 고르는 화면이 먼저 뜨고 그다음에야 기록 화면으로 넘어가는 구조였는데, 사용자가 이 순서 자체("책 기록하기 눌렀는데 왜 책 검색이 뜨나")를 여러 번 지적해서 `app/library/add/page.tsx`를 다시 썼습니다.

- **단일 화면으로 통합**: `search`/`manual-book`/`looking-up`/`record` 4단계 스텝 머신을 없애고 `form` 한 단계로 합쳤습니다. 진입하자마자 바로 기록 화면(제목 입력 → 상태 → 평점/기분 → 메모 → 사진/음성 → 저장)이 뜹니다.
- **제목 입력창이 곧 검색창**: "무슨 책을 읽었어?" 아래 제목 입력창에 2글자 이상 타이핑하면 400ms 디바운스로 카카오 키워드 검색을 부르고, 입력창 바로 아래 드롭다운으로 후보(표지+제목+저자)를 보여줍니다. 후보를 클릭하면 제목/저자/표지/ISBN이 자동으로 채워지고(이미 카탈로그에 있으면 `book_isbns`에서 찾아 재사용), 드롭다운은 닫힙니다. 아무 후보도 클릭하지 않고 그냥 타이핑을 끝내도 그 텍스트 그대로 기록됩니다 — 이게 곧 "ISBN 없이 등록"이던 이전 별도 경로를 대체합니다(더 이상 분리된 화면이 아님).
- **바코드/ISBN은 보조 수단으로 축소**: 제목 입력창 아래 "바코드로 찾기" / "ISBN으로 찾기" 텍스트 버튼을 누르면 그 자리에 스캐너 또는 ISBN 입력란이 펼쳐지고, 조회 성공 시 제목/저자/표지가 채워지며 다시 접힙니다 — 별도 화면 전환이 없습니다.
- 이 변경으로 화면 전환 자체가 없어졌기 때문에(레거시처럼 시작부터 끝까지 한 화면), "책 기록하기 → 책 등록 화면 → 기록 화면"으로 느껴지던 문제가 구조적으로 해결됩니다.

## 기록 탭 리스트 UI — 카드 나열 대신 한 박스 안에 구분선 (실사용 피드백 반영)

레거시 앱의 독서기록 리스트는 각 책마다 별도 카드가 아니라, 월별로 하나의 흰색 박스 안에 책들이 얇은 구분선(divider)으로만 나뉘어 쭉 나열됩니다. 책숲은 각 기록을 개별 둥근 카드(각자 테두리 + 그림자 + 카드 사이 여백)로 그려서 레거시보다 훨씬 답답해 보인다는 피드백을 반영해, `components/records-list.tsx`의 월별 그룹 렌더링을 바꿨습니다: 이제 한 달치 기록 전체를 감싸는 박스(`rounded-[var(--r)] border`) 하나를 만들고, 그 안의 각 기록 행은 자체 테두리 없이 `border-top`으로만 위 항목과 구분됩니다(첫 행은 구분선 없음). 클릭하면 수정 모달이 열리는 동작, 사진/음성 표시는 그대로입니다.

@AGENTS.md
