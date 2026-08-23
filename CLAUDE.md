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

## 오늘 탭 숙제 카드 단순화 + 최근 기록 박스화 + 전역 글자 크기 (실사용 피드백 반영)

- **숙제 카드에서 질문 미션 UI를 뺐습니다**: `components/assignment-today.tsx`에 있던 `QuestionMission`(질문 표시 + 답변 입력창 + 저장 버튼을 오늘 탭에 그대로 노출하던 컴포넌트)을 지웠습니다. "메인화면에 숙제 질문이 나올 필요는 없다"는 피드백에 따른 것으로, 질문 미션은 지금은 오늘 탭 어디에도 노출되지 않습니다(교사가 숙제 만들기에서 질문 미션을 추가하는 기능 자체는 그대로 남아있지만, 부모/아이가 답하는 화면은 없어진 상태 — 나중에 필요해지면 별도 화면으로 다시 붙일 수 있습니다). 낭독(voice) 미션은 그대로 남겨뒀습니다(질문형이 아니라 녹음 액션이라 사용자가 지운 대상이 아니라고 판단).
- **숙제 카드에 완료 카운트 배지 추가**: 각 숙제 카드 헤더 우측에 "N/M 완료" 배지를 추가했습니다(전부 완료면 초록, 아니면 회색). "간단하게 숙제 완료 여부정도는 뜨게 해달라"는 요청 반영.
- **숙제 책 클릭 → 기록 남기기로 연동**: 기존에는 안 읽은 책 옆에 "다 읽었어요" 버튼을 누르면 평점/사진 없이 `reading_records`를 바로 생성하는 경량 경로(`QuickReadButton`)였는데, 클릭해도 반응이 약해 보인다는 피드백이 있었고 무엇보다 기록을 제대로 남길 방법이 없었습니다. `QuickReadButton`을 지우고, 안 읽은 책 행 전체를 `/library/add?bookId=...&title=...&author=...&cover=...&groupId=...`로 가는 `Link`로 바꿨습니다 — 눌러 넘어가면 그 책 정보가 이미 채워진 채로 기록 남기기 화면이 뜨고(별도 검색 불필요), 상태·평점·사진까지 제대로 남길 수 있습니다. `app/library/add/page.tsx`가 마운트 시 이 쿼리 파라미터를 읽어 제목/저자/표지/책ID/그룹ID를 미리 채우는 effect를 추가했고(`useSearchParams` 사용을 위해 컴포넌트를 `<Suspense>`로 감쌈), 저장 시 `group_id`도 함께 기록해 교사용 `teacher_reading_view` RLS(그룹 소속 기준 조회)가 계속 정상 동작하도록 했습니다.
- **오늘 탭에 "오늘의 숙제" 섹션 헤더 추가**: `app/today/page.tsx`의 숙제 목록 위에 "최근 기록"과 같은 스타일의 "오늘의 숙제" 제목을 붙였습니다.
- **최근 기록도 기록 탭처럼 박스+구분선으로**: `components/recent-records.tsx`를 `records-list.tsx`와 같은 패턴(한 박스 + `border-top` 구분선)으로 바꿨습니다.
- **전역 글자 크기 확대**: "아이가 직접 기록할 수도 있으니 글자를 좀 더 키워달라"는 요청에 따라, 컴포넌트마다 일일이 크기를 바꾸는 대신 `app/globals.css`의 `html`에 `font-size: 112.5%`를 추가했습니다. Tailwind 유틸리티(`text-sm`, `p-4`, `rounded-[Npx]`가 아닌 클래스형 spacing 등)는 대부분 rem 기반이라, 이 한 줄로 글자 크기뿐 아니라 버튼·입력창 등의 여백·터치 영역도 비례해서 함께 커집니다(아이 손가락 기준 터치 영역도 커지는 효과). SVG 아이콘처럼 px로 고정된 요소나 `text-[11px]`류의 임의값(arbitrary value) 클래스는 이 스케일의 영향을 받지 않습니다.

## 책장 중복 제거 + 책장/기록 출처 필터·정렬 + 오늘의 숙제 요약화 (실사용 피드백 반영)

같은 책을 여러 그룹의 숙제로 각각 완독 기록하면(예: A반 숙제로도, B도서관 추천도서로도 같은 책을 기록) `reading_records`에 child_id+book_id 조합이 여러 번 생길 수 있습니다(각 기록은 `group_id`로 어느 그룹 소속인지 구분됨, `group_id`가 null이면 그룹과 무관하게 직접 기록한 것). 스크린샷으로 책장에 같은 책 표지가 두 번 뜨는 게 보고돼서, 이 다중 기록 자체는 유지하되(그룹별로 따로 기록할 수 있어야 하니까) **책장 기본 화면에서만 책 단위로 합쳐** 보여주도록 고쳤습니다.

- **책장 중복 제거**: `components/library-shelf.tsx`의 `ShelfBook`을 "책 한 권 + 그 책에 딸린 기록들(`instances[]`, 그룹별/직접기록 전부)"로 재구성했습니다. 기본(전체) 화면에서는 책마다 대표 기록 하나만 골라 카드 한 장으로 보여줍니다(대표 선정: 다 읽음 > 읽는 중 > 읽고 싶어요 우선, 동률이면 최신 기록). `app/library/page.tsx`가 `reading_records`를 book_id로 묶어 `instances`를 만들고, "발자국 N개"도 (레코드 수가 아니라) 완독한 책의 **고유 book_id 개수**로 다시 계산해 중복 집계를 막았습니다.
- **책장/기록에 출처(그룹) 필터 추가**: "선생님이 숙제로 낸 책인지 기관 추천도서인지 구분해서 보고 싶다"는 요청을 그룹 단위 필터로 구현했습니다 — `전체 출처 / 직접 기록 / (그룹명)` 칩을 검색창 아래에 추가했고, 실제 기록에 등장하는 그룹만 칩으로 뜹니다(가입만 하고 기록이 없는 그룹은 안 뜸). 책장에서 특정 그룹을 선택하면 그 그룹에서의 기록을 대표로 보여주고(다른 그룹 기록이었다면 카드에서 빠짐), 기록 탭에서는 애초에 책 단위로 합치지 않으므로(아래 참고) 그 그룹의 개별 기록들이 그대로 필터링됩니다.
- **기록 탭은 합치지 않음**: `기록` 탭(`components/records-list.tsx`)은 "읽은 사건" 하나하나를 보여주는 화면이라 책 단위로 합치면 오히려 정보 손실이라, 여기는 중복 제거를 하지 않고 각 그룹의 기록을 있는 그대로 리스트에 보여줍니다. 대신 같은 출처 필터 칩과 각 행에 그룹명(있으면)을 작게 붙였습니다.
- **책장/기록에 정렬 추가**: 책장은 기존 정렬(최신순/제목순/작가순) 그대로 두고 중복 제거된 목록에 적용합니다. 기록 탭에는 정렬 드롭다운이 없었는데, "최신순"을 고르면 기존처럼 월별 박스+구분선 그대로, "제목순"/"작가순"을 고르면 월 구분 없이 전체를 한 박스에 정렬해서 보여주도록 `records-list.tsx`를 고쳤습니다.
- **오늘 탭은 숙제 요약만, 상세는 `/today/assignments`로 분리**: "오늘의 숙제가 요약 형태여야 하는데 거기에 (책 목록·낭독 녹음까지 있는) 숙제카드를 왜 보여주냐"는 지적을 반영해, `app/today/page.tsx`의 "오늘의 숙제" 섹션을 `components/assignment-summary.tsx`(그룹명+제목+"N/M 완료" 배지만 있는 한 줄짜리 행, 박스 안에 구분선, 그룹명 기준으로 정렬해 같은 그룹끼리 붙어 보이게 함)로 바꿨습니다. 각 행을 누르면 `/today/assignments#{assignmentId}`로 이동해, 기존에 오늘 탭에 있던 상세 카드(책마다 "기록하기" 링크, 낭독 미션 녹음 등 — `components/assignment-today.tsx`, 그대로 유지)가 있는 전용 페이지로 넘어가고 해당 숙제 카드로 스크롤됩니다. 두 화면이 같은 데이터를 쓰므로 조회 로직은 `lib/assignments.ts`의 `getTodayAssignments()`로 뽑아 공유합니다.

## 오늘의 숙제 요약 그룹핑 + 완료된 숙제 책도 수정 가능 (실사용 피드백 반영)

- **같은 그룹 숙제는 구분선 없이 한 섹션으로**: "Haba 7세반"처럼 같은 그룹의 숙제 두 개가 각자 구분선으로 나뉘어 그룹명이 반복 표시되던 걸 지적받아, `components/assignment-summary.tsx`를 그룹명 기준 섹션 구조로 다시 짰습니다. 그룹명은 섹션당 한 번만 뜨고, 그 그룹의 숙제 제목들은 구분선 없이 바로 이어지며, **다른 그룹으로 넘어갈 때만** `border-top` 구분선이 들어갑니다.
- **`/today/assignments`(전체 보기)에서 완료된 숙제 책도 클릭해 수정 가능**: 이전엔 "읽었어요"로 완료 표시된 책이 그냥 정적 텍스트라 클릭해도 아무 일이 없었는데, 이제 눌러서 `RecordEditModal`이 뜨고 평점·기분·즐겨찾기·메모를 바로 고칠 수 있습니다. `lib/assignments.ts`의 `getTodayAssignments()`가 숙제 책마다 대응하는 `reading_records`(가장 최근 `status='done'` 기록 하나, 같은 책을 여러 그룹 숙제로 완독했다면 그중 가장 최근 것을 대표로 씀)를 함께 조회해 `TodayBook`에 `recordId`/`rating`/`emotion`/`favorite`/`memo`로 실어 보내고, `components/assignment-today.tsx`가 이 데이터로 수정 모달을 채웁니다.

## 부분 읽기 숙제 + 상태 무관 기록 + 레거시 기록장 UI 이식 (실사용 피드백 반영)

레거시 "유안이 독서기록"의 기록장 화면(언제 읽었어? / 재미있었어? 스티커 / 뭐가 제일 기억나?)을 스크린샷으로 참고 삼아, 사용자가 직접 디자인한 아이콘이니 그대로 재사용해도 된다고 확인받아 옮겨왔습니다. 동시에 "숙제가 꼭 완독이어야 하는 건 아니다"(예: 이번 주는 30쪽까지만)라는 지적을 스키마 레벨에서 반영했습니다.

- **마이그레이션 0012**: `assignment_books.target_page`(int, null이면 완독이 기준)와 `reading_records.pages_read`(int, "읽는 중" 상태일 때 몇 쪽까지 읽었는지)를 추가하고, `assignment_completion` 뷰가 `status='done'`뿐 아니라 `status='reading' and pages_read >= target_page`도 완료로 인정하도록 고쳤습니다. 로컬 Postgres에서 목표 쪽수 미달(false)→충족(true)→완독 전용 대조군(status만 인정) 세 경우 모두 확인했습니다.
- **숙제 만들기에 목표 쪽수 입력**: `components/create-assignment.tsx`에서 책을 선택하면 그 아래 "OO쪽까지 (비워두면 완독이 기준)" 입력란이 펼쳐집니다.
- **레거시 아이콘을 그대로 이식**: `legacy/index.html`의 인라인 SVG 심볼(별점/웃음/보통/찡그림 등 평점 스티커, 달력·반복 아이콘)을 `components/icons/record-icons.tsx`로 옮겼습니다 — AI 클립아트가 아니라 사용자가 이미 만들어 쓰던 벡터 아이콘이라 재사용 원칙에 어긋나지 않습니다.
- **`components/rating-picker.tsx`**: 숫자 원형 버튼이던 평점을 레거시처럼 "최고/재밌어/좋아/보통/별로" 색깔 스티커(블롭 모양 + 아이콘 + 라벨)로 바꿨습니다. `app/library/add`와 `RecordEditModal` 양쪽에 적용.
- **`components/read-date-picker.tsx`**: "언제 읽었어?"를 오늘/어제/그제 빠른 버튼 + 직접 날짜 입력으로 추가했습니다 — 이전엔 `read_date`를 남기거나 고칠 방법이 전혀 없었고(DB 기본값에만 의존) 항상 오늘 날짜로 저장됐던 실제 기능 공백이었습니다.
- **상태와 무관하게 전체 기록 가능**: "읽고 싶어요"/"읽는 중"일 때 평점·기분·즐겨찾기·오늘의 질문을 숨기던 걸 없앴습니다 — 이제 상태와 무관하게 항상 보이고, "다 읽음"이 아닐 때는 "평점·기분 같은 나머지 기록은 다 읽고 나서 채워도 괜찮아요" 안내만 붙습니다. "읽는 중"일 때는 "몇 쪽까지 읽었어?" 입력란도 함께 뜹니다(`pages_read`).
- **숙제 질문 미션도 복원**: 지난 피드백으로 오늘 탭에서 뺐던 질문 미션 답변 UI(`QuestionMission`)를 상세 화면인 `/today/assignments`에는 다시 넣었습니다(오늘 탭 요약에는 여전히 안 뜸) — "랜덤 질문 박스도 유지, 숙제 질문도 유지"라는 요청 반영.
- **타이포그래피 위계 + 카드 그림자**: `app/globals.css`의 `.d`(제목/라벨에 붙는 디스플레이 폰트 클래스) 기본 굵기를 400→600으로 올려 제목과 본문 텍스트의 위계가 또렷해지게 했고, 앱 전반의 표준 카드 반경 클래스(`rounded-[var(--r)]`)에 은은한 `box-shadow`를 공통으로 얹어 세이지그린 배경과 흰 카드가 잘 구분되게 했습니다.
- **의도적으로 미룬 것**: 레거시의 "몇 번 읽었어?"(한 기록 안에서 재독 횟수를 세는 카운터)와 "뭐가 제일 기억나?" 6종 아이콘 타일(웃긴 장면/신기한 장면/마음에 남은/주인공/그림/새로 안 말 — 탭하면 그 카테고리의 질문이 뜨는 방식)은 이번에 옮기지 않았습니다. 전자는 지금 배지 시스템의 "다시 읽기" 판정(같은 책을 여러 번 기록하면 재독으로 계산)과 모델이 달라 데이터 구조를 새로 고민해야 하고, 후자는 우리 질문 은행(`book_questions`)에 카테고리 태그가 없어 탭마다 실제로 다른 질문을 보여주려면 시드 데이터부터 다시 짜야 합니다. 필요하시면 별도로 진행하겠습니다.

## 오늘의 질문에 답 쓰는 칸이 없던 문제 (실사용 피드백 반영)

`components/question-prompt.tsx`("오늘의 질문" 박스)와 그 아래 별도로 있던 "부모 메모" textarea가 화면상 서로 무관해 보여서, 질문에 대한 답을 어디에 써야 할지 알 수 없다는 피드백을 받았습니다. 두 요소를 하나로 합쳤습니다: `QuestionPrompt`가 이제 `answer`/`onAnswerChange` props를 받는 controlled 컴포넌트가 되어, 질문 바로 아래에 그 답을 쓰는 textarea를 직접 그립니다(질문 은행이 비어 있으면 "부모 메모" placeholder로 대체돼 항상 뭔가는 쓸 수 있습니다). "다른 질문"으로 질문을 바꾸면 이전 답은 지워집니다(`onAnswerChange("")`) — 질문마다 새로 답을 쓸 수 있게 하기 위함입니다. `app/library/add/page.tsx`에서 기존에 따로 있던 "부모 메모" textarea는 지우고 `<QuestionPrompt answer={memo} onAnswerChange={setMemo} />` 하나로 대체했습니다(저장되는 컬럼은 그대로 `reading_records.parent_memo` 하나뿐이라 스키마 변경은 없습니다).

## 상단 고정 "{아이}의 책숲" 타이틀 + 오늘 탭 위계 + 추천 탭 분야별 목록 + 버튼 색상 정리 (실사용 피드백 반영)

- **상단 고정 타이틀**: 화면마다 따로 "오늘"/"책장"/"기록"/"배지"/"추천" 제목을 쓰던 걸 없애고, `components/top-bar.tsx`가 부모 계정이면 항상 "{아이 이름}의 책숲"을 화면 최상단(스크롤에도 안 움직임)에 띄우도록 했습니다. 같은 줄 우측에 기존 '더보기' 아이콘이 그대로 있습니다. `lib/active-child.ts`의 `getActiveChild()`를 클라이언트에서 재사용해 아이 이름을 가져옵니다(교사/큐레이터는 "책숲"만 뜸 — 이 계정엔 아이가 없으므로). 각 탭 페이지의 `<h1>오늘</h1>` 같은 중복 제목은 지웠습니다(로그인 필요/아이 없음 같은 예외 화면의 제목은 그대로 남겨뒀습니다 — 상단 타이틀이 아직 뭘로 뜰지 불확실한 상태라).
- **오늘 탭 위계 정리**: "오늘의 숙제"/"최근 기록" 박스 안의 책 제목·표지를 절보다 한 단계 작게(`text-base`→`text-sm`, 표지도 축소) 줄이고, 박스 안 구분선을 옅은 색(`rgba(38,54,43,0.08)`)으로 바꾸고 좌우 여백을 둬 박스 테두리에 안 닿게 했습니다(`components/assignment-summary.tsx`, `components/recent-records.tsx`, 기록 탭의 `components/records-list.tsx`도 같은 구분선 스타일로 통일). `.d` 클래스 기본 굵기(600, 지난 피드백에서 이미 올림)와 대비되어 제목/버튼 라벨이 더 도드라져 보입니다.
- **추천 탭 분야별 목록 (마이그레이션 0013)**: `book_categories(book_id, category)` 조인 테이블을 추가해 책 한 권이 여러 분야("두 분야 수록")에 속할 수 있게 했습니다(고정 enum이 아니라 텍스트라 나중에 분야를 늘려도 마이그레이션이 필요 없음 — 화면에 쓰는 표준 7종 목록은 `lib/categories.ts`). 그룹 상세 화면(`app/recommend/[groupId]/page.tsx` + `components/recommend-book-list.tsx`)이 이제 HABA 100처럼 "N/M권·P%" 진행률 카드 + 전체/필독/분야별 필터 칩 + 분야별로 묶인 목록을 보여줍니다. 필독 여부는 새 컬럼이 아니라 원래 있던 `book_list_items.required`를 그대로 씁니다(지금까지 화면에 안 쓰이고 있었음). 교사가 책을 추가할 때(`components/add-book-to-list.tsx`) 이제 후보를 고르면 바로 추가되지 않고, 분야 칩(여러 개 선택 가능) + 필독 체크박스를 정하는 확인 단계를 거칩니다.
- **"책장에 꽂기"**: 부모가 그룹의 추천도서 목록을 보다가 마음에 드는 책을 바로 자기 책장에 넣을 수 있게, 각 책 행에 "책장에 꽂기" 버튼을 추가했습니다(이미 있는 책이면 "책장에 있어요"로 대체). `status='want'`, `group_id`=그 그룹으로 `reading_records`를 만들어서, 책장 탭의 "직접 기록/그룹" 출처 필터에도 정상적으로 걸립니다.
- **책장/기록/오늘 탭 진입 버튼 정리**: 책장 탭의 "+ 기록 남기기" 버튼을 "+ 책장에 책 꽂기"로 바꿨습니다(책장 탭 문맥에 맞게). 기록 탭의 "책 기록하기"는 한 줄 전체 너비의 큰 버튼으로 키우고 `--lantern`(호박색) 배경으로 바꿔 눈에 잘 띄게 했고, 오늘 탭에도 같은 버튼을 상단(통계 카드 위)에 추가했습니다.
- **샘플 계정 세팅 스크립트**: `sangwkk@naver.com`을 "하바 7세반" 교사로, 백희나 작가의 '알사탕'(필독)·'이상한 손님'을 그 반 추천도서로 등록하는 `supabase/seed/sample_haba7.sql`을 만들었습니다. Claude Code는 실제 Supabase 프로젝트의 `auth.users`에 직접 접근할 권한이 없어서(서비스 롤 키 없음), 사용자가 먼저 앱 `/signup`에서 그 이메일로 정상 회원가입을 마친 뒤, 이 스크립트를 SQL Editor에서 실행하는 2단계 흐름입니다. 로컬 Postgres에서 mock `auth.users`에 같은 이메일로 가입 → 스크립트 실행 → 그룹/책/카테고리/필독 여부가 의도대로 들어가는 것까지 확인했습니다.

## 아이 전환 시 상단 제목이 안 바뀌던 버그 + 중복 조회 정리 (실사용 피드백 반영)

"똥강아지로 이름을 새로 입력했는데 제목이 왜 안 바뀌냐"는 질문을 받고 확인해보니, 글자 수 제한 같은 건 없었고(`children.name`은 그냥 `text`) 실제로는 두 가지가 겹친 문제였습니다.

- **버그**: 더보기 → 아이 관리에서 아이를 전환(`components/child-switcher.tsx`)하면 `router.refresh()`만 불렀는데, 이건 서버 컴포넌트만 다시 그리고 `TopBar`(상단 "OO의 책숲" 제목)는 마운트 시 한 번만 조회하는 클라이언트 컴포넌트라 다시 실행되지 않았습니다 — 그래서 DB의 `active_child_id`는 바뀌어도 상단 제목은 하드 새로고침 전까지 그대로였습니다.
- **겹친 원인**: 새 아이를 추가해도 자동으로 "활성 아이"가 되긴 하지만(`child_guardians` 등록 직후 `active_child_id`를 그 아이로 세팅하는 코드가 이미 있음), 위 버그 때문에 제목에 즉시 반영되지 않아 "이름 입력하면 제목이 바뀌어야 하는데 안 바뀐다"처럼 보였습니다.
- **수정**: `components/profile-context.tsx`(신규)로 역할(role)·활성 아이 이름 조회를 한 곳으로 모으고, `TopBar`/`BottomNav`가 각자 하던 `auth.getUser()` + `users` 조회를 이 공용 컨텍스트 하나로 합쳤습니다(화면 전환마다 두 컴포넌트가 따로 왕복하던 중복 네트워크 요청도 함께 줄었습니다). `child-switcher.tsx`가 전환/추가 성공 시 `window.dispatchEvent(new Event("chaeksup:profile-changed"))`를 쏘면 컨텍스트가 즉시 다시 불러와, 더보기 화면을 떠나지 않아도 상단 제목이 바로 바뀝니다.
- **속도 관련 별도 질문**: "느린 게 앱으로 출시하면 나아지냐"는 질문에는, 지금 체감 지연의 상당 부분이 Vercel 서버리스 함수의 콜드 스타트/리전 왕복 + 화면마다 Supabase에 다시 쿼리하는 서버 컴포넌트 구조 때문이라, 네이티브 앱 셸(웹뷰) 자체는 이 네트워크 지연을 없애주지 않는다고 답변했습니다. 이번에 줄인 중복 클라이언트 조회는 실질적으로 도움이 되는 부분이고, 더 개선하려면 캐싱이나 낙관적 UI 갱신 같은 별도 작업이 필요합니다.

## 로딩 스켈레톤 (실사용 피드백 반영 — "화면 전환이 너무 느리다")

데이터가 오가는 지연 자체(Vercel↔Supabase 네트워크 왕복)는 코드로 없앨 수 없지만, 그 동안 화면이 하얗게 멈춰 보이는 건 고칠 수 있는 부분이라 이것부터 먼저 처리했습니다.

- **`components/loading-skeleton.tsx`**: 제목 줄 + 카드 몇 개를 회색 펄스(`animate-pulse`)로 흉내 낸 범용 스켈레톤 하나만 만들고, 페이지마다 다른 스켈레톤을 그리지 않았습니다(유지보수 부담과 실제 체감 효과의 균형).
- **각 라우트에 `loading.tsx` 추가**: Next.js App Router는 라우트 폴더에 `loading.tsx`가 있으면 그 세그먼트의 서버 컴포넌트가 데이터를 불러오는 동안 자동으로 그 파일을 먼저 보여줍니다(직접 로딩 상태를 관리하는 코드 없이 파일만 추가하면 됨). `/today`, `/library`, `/records`, `/recommend`, `/recommend/[groupId]`, `/badges`, `/more`, `/teacher`, `/teacher/assignments`, `/teacher/children`, `/curator`, `/today/assignments`(모두 동적 렌더링 라우트)에 추가했습니다. `app/layout.tsx`의 `<TopBar>`/`<BottomNav>`는 이 로딩 경계 바깥에 있어서, 화면을 전환해도 탭 강조 표시는 즉시 바뀌고 본문 영역만 스켈레톤 → 실제 내용으로 바뀝니다.
- **캐싱은 아직 하지 않음**: 독서기록처럼 자주 바뀌는 사용자별 데이터를 섣불리 캐싱하면 오래된 정보가 보일 위험이 있어, 이번엔 손대지 않았습니다. 다음 단계로 고려할 만한 것: 거의 안 바뀌는 데이터(카카오 책 검색 결과 재사용은 `book_isbns` 유니크 제약으로 이미 사실상 캐싱되고 있음)에 한해 `fetch`/`unstable_cache`로 캐싱, Vercel 프로젝트 리전과 Supabase 프로젝트 리전이 가까운지 확인(리전이 멀면 매 쿼리마다 왕복 지연이 커짐 — 이건 코드가 아니라 각 대시보드 설정 확인이 필요해서 사용자가 직접 봐야 함).

## 탭 전환이 6초씩 걸리던 진짜 원인 (실사용 피드백 반영)

스켈레톤을 넣은 뒤에도 "카톡은 안 이런데 오늘→책장이 6초씩 걸린다"는 지적을 받고, 실제 요청 경로를 다시 짚어봤습니다. 로딩 스피너로 가릴 문제가 아니라 **탭 하나 옮길 때마다 Supabase에 순차 왕복이 6번 가까이** 일어나고 있었습니다:

1. `proxy.ts`(미들웨어)가 모든 탭 경로 요청마다 `auth.getUser()`(세션 검증, 네트워크 왕복) → `users.onboarding_completed` 조회(왕복 2번째)를 매번 새로 했습니다. 온보딩 완료 여부는 사실상 한 번 정해지면 다시 안 바뀌는데도요.
2. 그 다음 페이지 서버 컴포넌트가 또 `auth.getUser()`(왕복 3번째, 미들웨어가 방금 검증한 걸 또 검증)를 부르고, `getActiveChild()`가 `users.active_child_id` 조회(4번째) → `children` 조회(5번째)를 순서대로 했습니다. 여기에 화면 본문 쿼리(6번째)까지 더해지면, 리전이 조금만 멀어도 각 왕복이 수백 ms씩만 걸려도 금방 3~6초가 됩니다.

이번에 고친 것 (전부 로컬 Postgres로 RLS/데이터가 그대로 나오는지 확인 후 적용):
- **온보딩 확인을 쿠키로 캐싱**: `proxy.ts`가 `chaeksup_onboarded` 쿠키가 있으면 DB 조회를 건너뜁니다. 처음 한 번만 조회해서 완료 상태면 쿠키를 심고, 이후 탭 이동에서는 이 쿼리 자체가 사라집니다(로그아웃 시 `sign-out-button.tsx`가 쿠키를 지워서 다른 계정으로 로그인해도 안 꼬임).
- **`getActiveChild()` 왕복 2번 → 1번**: `users.active_child_id`와 그 아이 정보를 따로 조회하던 걸, `users` 조회 한 번에 `children(id, name, avatar)`를 같이 임베드해서 가져오도록 합쳤습니다(`users.active_child_id → children.id` FK가 있어서 PostgREST가 조인해줍니다). 이 함수는 거의 모든 부모 화면(오늘/책장/기록/배지/추천 등)이 부르기 때문에, 화면마다 왕복 1번씩 줄어드는 효과가 있습니다.
- **의도적으로 안 건드린 것**: 미들웨어와 각 페이지가 각각 `auth.getUser()`를 부르는 이중 검증은 Supabase의 공식 권장 패턴이라(미들웨어의 결과를 서버 컴포넌트가 안전하게 재사용할 방법이 마땅치 않음) 이번엔 손대지 않았습니다. 이걸 없애려면 미들웨어가 검증한 사용자 정보를 요청 헤더로 넘겨 각 페이지가 재검증 없이 신뢰하는 구조로 바꿔야 하는데, 인증 관련 코드라 서두르지 않고 필요하면 별도로 검토하겠습니다.

## 오늘 탭이 유독 느렸던 원인 — 순차 조회를 병렬로 (실사용 피드백 반영)

속도를 개선했는데도 "오늘 탭이 스켈레톤에서 안 넘어간다"는 스크린샷을 받고 다시 짚어보니, 오늘 탭 하나가 다른 탭보다 훨씬 무거운 구조였습니다: `getTodayAssignments()` 내부에서 `assignment_completion`/`assignment_mission_responses`/완료된 책의 `reading_records`를 순서대로 하나씩 기다리고 있었고(서로 관련 없는 조회인데도), 오늘 탭 페이지 자체도 역할 조회 → 활성 아이 조회 → 통계용 `reading_records` 조회 → `getTodayAssignments()`를 전부 순서대로 기다리고 있었습니다.

- **`lib/assignments.ts`**: `assignment_completion`, `assignment_mission_responses`, 완료된 책의 `reading_records` 세 조회가 전부 assignmentRows에서 뽑은 id 목록에만 의존하고 서로 무관하다는 걸 확인하고, `Promise.all`로 동시에 왕복하도록 바꿨습니다(왕복 3번 → 1번).
- **`app/today/page.tsx`**: role 조회와 활성 아이 조회(둘 다 user.id에만 의존), 그리고 통계용 `reading_records` 조회와 `getTodayAssignments()`(둘 다 activeChild.id에만 의존)를 각각 `Promise.all`로 동시에 실행하도록 바꿨습니다. `app/today/assignments/page.tsx`도 `getTodayAssignments()`와 `hasVoiceConsent()`를 동시에 실행하도록 같은 방식으로 고쳤습니다.
- **되게 빠른데도 여전히 느리다는 질문에 답변**: 카카오톡 같은 네이티브 앱은 데이터를 기기에 미리 저장해두고 화면 전환 시 네트워크를 안 타는 구조라, 매번 서버에 물어보는 웹 앱(책숲)과는 애초에 체급이 다릅니다. Vercel을 다른 호스팅으로 옮겨도 "브라우저 → 서버 → DB" 왕복 구조 자체는 똑같아서 근본적인 차이는 안 생기고, 대신 지금처럼 왕복 횟수 자체를 줄이는 게 실질적인 개선입니다. 사용자에게 직접 확인을 부탁한 것: (1) Vercel 프로젝트와 Supabase 프로젝트의 리전이 같은/가까운 지역인지, (2) 둘 다 무료(Hobby/Free) 플랜이면 콜드 스타트·커넥션 제한이 있어 유료 플랜 전환도 고려해볼 만하다는 점.

## 기록 남기기 화면의 사진·음성 섹션을 레거시 앱처럼 친근하게 (실사용 피드백 반영)

레거시 "유안이 독서기록" 사이트 스크린샷 3장(기록 남기기 화면의 사진/음성 섹션, 레거시의 "유안이 기록" 섹션, 레거시의 날짜/평점 스티커 섹션)을 근거로, "Xx의 기록 기록장", "인상깊은 장면 기억하기(스캔기능)", "xx의 목소리 남기기" 같은 친근한 문구로 바꾸고 내용 간 연하고 얇은 구분선을 넣어달라는 요청을 반영했습니다.

- **`app/library/add/page.tsx`의 사진·음성 섹션을 "{아이 이름}의 기록" 카드로 묶음**: 기존엔 "사진 (선택)"/"음성 기록 (선택)"이라는 사무적인 라벨의 별개 블록이었는데, 이제 `getActiveChild()`로 조회한 아이 이름을 헤더에 써서("똥강아지의 기록") 하나의 카드 안에 묶었습니다. 사진 섹션은 "인상 깊었던 장면을 사진으로 남겨보세요" 안내 문구 + `PhotoPicker`(새로 추가한 `label` prop으로 버튼 텍스트를 "장면 찍어 담기"로 교체)로, 음성 섹션은 "오늘 읽은 소감을 목소리로 남겨보세요" 안내 문구 + `VoiceRecorder`(버튼 라벨을 "{아이 이름}의 목소리로 남기기"로 교체)로 구성했습니다. 레거시의 "기록장 인쇄"/"빈 기록장 인쇄" 버튼은 책숲에 인쇄 개념이 없어 옮기지 않았고, "스캔" 쪽의 의도(장면을 담아 기록에 남기는 것)만 사진 섹션 문구로 반영했습니다.
- **`components/voice-recorder.tsx`**: `label` prop의 의미를 "버튼에 붙는 짧은 명사"에서 "버튼에 그대로 표시되는 완성된 문구"로 바꿨습니다(기존엔 컴포넌트가 `{label} 시작`으로 자동으로 "시작"을 붙였는데, "OO의 목소리로 남기기"처럼 이미 완성된 문장을 넣을 수 있어야 해서). 기존 호출부 두 곳(`app/library/add/page.tsx`, `components/assignment-today.tsx`의 낭독 미션)은 각각 "음성 기록 시작"/"낭독 시작"으로 문구를 유지해 동작이 그대로입니다.
- **`components/photo-picker.tsx`**: 버튼 텍스트를 하드코딩("사진 첨부")하던 걸 `label` prop(기본값은 그대로 "사진 첨부")으로 바꿔, 호출부마다 다른 문구를 쓸 수 있게 했습니다.
- **연하고 얇은 구분선 추가**: 기록 남기기 화면(`app/library/add/page.tsx`)의 "책 찾기" 섹션 뒤, "지금 상태/날짜/쪽수" 섹션 뒤, "평점/기분/즐겨찾기/오늘의 질문" 섹션 뒤, 그리고 사진·음성 카드 내부(사진 섹션과 음성 섹션 사이)에 이미 앱 곳곳에서 쓰던 옅은 구분선(`rgba(38,54,43,0.08)`, `border-top`)을 추가해 내용을 시각적으로 구획했습니다. 같은 패턴을 `components/record-edit-modal.tsx`의 상태/날짜 섹션과 평점/기분 섹션 사이에도 적용했습니다.

## 국립어린이청소년도서관 사서추천도서 자동 연동 (사용자 요청)

사용자가 data.go.kr의 공공데이터(15104976, 국립어린이청소년도서관_사서추천도서)를 큐레이터 하나로 추가해서 자동으로 추천도서가 뜨게 해달라고 요청했습니다. 이 API는 실제로는 data.go.kr이 아니라 한국문화정보원(KCISA)의 `api.kcisa.kr` 게이트웨이에서 제공되고(요청 URL `https://api.kcisa.kr/openapi/service/rest/meta2/NLCFsase`), 도서 전용 스키마가 아니라 범용 메타데이터 스키마(`title`/`creator`/`description` 등 17개 필드, ISBN·표지·출판사 필드가 아예 없음)라는 걸 사용자가 문화공공데이터광장 페이지 내용을 직접 복사해준 덕분에 확인했습니다(제 세션 자체가 data.go.kr/nl.go.kr/culture.go.kr 전부 네트워크로 막혀 있어 문서를 직접 못 열어봄 — 이번엔 사용자가 대신 봐준 페이지 내용으로 정확한 필드명을 확정).

- **`lib/nlcy-sync.ts`**: 동기화 핵심 로직. ISBN이 없으므로 카카오 책 검색(`KAKAO_REST_API_KEY`, 이미 있던 것 재사용)으로 제목을 검색해 표지/출판사/ISBN을 보강하고, 그래도 못 찾으면 `source='nlcy'`로 표지 없이 등록합니다. XML 응답은 정확한 감싸는 구조(`response>body>items>item` 등)를 확인할 방법이 없어서 "title 필드를 가진 객체들의 배열"을 트리 어디서든 재귀로 찾는 방식(`findItems`)으로 방어적으로 파싱합니다. **로컬에서 XML 파싱 로직만 별도로 검증하다가 실제 버그를 하나 잡았습니다**: `fast-xml-parser`의 기본 옵션(`parseTagValue: true`)이 `resultCode`값 `"0000"`을 앞자리 0이 없어지는 숫자 `0`으로 파싱해버려서, 정상 응답인데도 "0" !== "0000"으로 판정돼 매번 API 오류로 잘못 처리될 뻔했습니다 — `parseTagValue: false`로 고쳐서 모든 태그 값을 문자열로 유지하도록 했습니다.
- **서비스 롤 키 없이 RLS 통과하기**: 이 프로젝트엔 Supabase 서비스 롤 키가 없어서(그동안 `sample_haba7.sql` 때도 마찬가지), `book_list_items`에 자동으로 쓰려면 진짜 로그인한 사용자 컨텍스트가 필요합니다. 그래서 "국립어린이청소년도서관" 전용 큐레이터 계정을 하나 만들고(`supabase/seed/nlcy_curator.sql`, `sample_haba7.sql`과 동일한 2단계 패턴 — 먼저 `/signup`으로 회원가입, 그 다음 시드 스크립트 실행), 동기화 코드가 서버에서 `NLCY_CURATOR_EMAIL`/`NLCY_CURATOR_PASSWORD` 환경변수로 그 계정에 직접 로그인해서(`supabase.auth.signInWithPassword`) 그 권한으로 쓰고 마지막에 로그아웃합니다. 그 계정은 실제 사람이 로그인할 일이 없는 시스템 계정입니다.
- **중복 방지**: 마이그레이션 0014로 `book_list_items(book_list_id, book_id)`에 유니크 제약을 추가하고 upsert(`ignoreDuplicates: true`)로 넣습니다. ISBN이 있으면 기존 `book_isbns` 재사용, 없으면 같은 목록 안에서 제목+저자로 이미 있는지 확인 후 건너뜁니다(연 1회 갱신되는 데이터라 매일 동기화해도 대부분 건너뛰기만 할 것으로 예상).
- **두 경로로 트리거**: `/api/cron/nlcy-sync`(Vercel Cron 전용, `vercel.json`에 매일 KST 04시로 등록, `CRON_SECRET` 헤더로 보호)와 `/api/curators/nlcy/sync-now`(로그인한 큐레이터 계정이 부르는 수동 트리거, role만 확인) 두 라우트가 같은 `syncNlcyRecommendations()` 함수를 부릅니다. 큐레이터 대시보드(`app/curator/page.tsx`)에 이 그룹일 때만 "지금 동기화" 버튼(`components/nlcy-sync-button.tsx`)이 뜹니다.
- **그룹 분류**: 사용자는 "크리에이터에 추가"라고 표현했지만, 실제로는 국가기관 도서관이라 `groups.type`은 `creator`가 아니라 `library`(도서관)로 넣었습니다 — `role='curator'`(큐레이터 계정 종류)와 `groups.type`(그룹 표시 유형)은 별개 값이라, "큐레이터 기능으로 등록하되 유형 라벨은 도서관으로 정확하게 보이는" 두 요구를 동시에 만족합니다. `join_policy='open'`이라 부모는 승인 없이 바로 팔로우할 수 있습니다.
- **실제로 검증하지 못한 것**: 제 세션에서 KCISA API 자체를 호출해볼 수 없어서(네트워크 차단), 실제 서비스키로 첫 동기화를 돌려서 필드가 예상대로 들어오는지는 사용자가 Vercel에 배포한 뒤 "지금 동기화" 버튼으로 직접 확인해야 합니다. XML 파싱 로직 자체는 문서에 나온 필드명을 그대로 반영한 샘플 XML 몇 가지 모양으로 로컬에서 별도 검증했습니다.
- **실사용 확인 + 후속 수정 2건**: 사용자가 실제로 큐레이터 계정을 시딩하고 "지금 동기화"를 눌러 31권이 정상적으로 들어오는 걸 확인했습니다. 그 과정에서 두 가지를 더 고쳤습니다.
  1. **동기화 속도**: 책마다 카카오 검색을 순서대로 하나씩 기다리고 있어서 항목이 몇십 개만 돼도 눈에 띄게 오래 걸렸습니다(사용자가 "동기화 중..."에서 한참 멈춰 있는 걸 실제로 겪음). 6개씩 묶어 `Promise.all`로 동시에 처리하도록 고쳐서, 다음 동기화부터는 훨씬 빨리 끝납니다. `numOfRows` 기본값도 100 → 50으로 낮췄습니다.
  2. **계정 전환 시 하단 탭이 안 바뀌는 버그(NLCY와 무관한 기존 버그, 이번에 우연히 발견)**: 큐레이터 계정으로 로그인해 테스트한 뒤 부모 계정으로 다시 로그인했더니, 오늘 탭 내용은 부모 계정 것으로 정상인데 하단 탭만 큐레이터용(대시보드/그룹)이 그대로 떠 있었습니다. 로그인/로그아웃이 `router.replace()`+`router.refresh()`로 하는 소프트 네비게이션이라, 루트 레이아웃에 마운트된 `ProfileProvider`(`components/profile-context.tsx`)가 다시 마운트되지 않고 이전 계정의 role을 계속 들고 있던 게 원인이었습니다. `supabase.auth.onAuthStateChange()` 구독을 추가해서, 로그인/로그아웃 등 인증 상태가 바뀔 때마다 role을 다시 불러오도록 고쳤습니다(기존의 "chaeksup:profile-changed" 커스텀 이벤트는 같은 계정 안에서 활성 아이만 바꿀 때 쓰던 것이라 계정 전환 자체는 못 잡고 있었습니다).

## 전반적인 속도 개선 + 코드 정리 (사용자 요청: "속도향상 방법 모색해봐... 다 찾아봐")

지금까지 오늘 탭 하나씩 순차 왕복을 병렬로 바꾸는 식의 부분적 최적화는 여러 번 했었는데, 이번엔 앱 전체를 훑어서 남아있는 구조적 지연 요인을 찾아 고쳤습니다. DB 스키마/RLS는 건드리지 않은 순수 애플리케이션 코드 변경이라 로컬 Postgres 검증 없이 build+lint로만 확인했습니다.

- **미들웨어·페이지 이중 인증 검증 제거 (가장 큰 개선)**: 이전부터 "인증 관련이라 서두르지 않겠다"고 미뤄뒀던 부분입니다. `proxy.ts`(미들웨어)가 모든 요청마다 `supabase.auth.getUser()`로 Supabase Auth 서버에 네트워크 왕복해 세션을 검증하는데, 그 직후 페이지 서버 컴포넌트가 또 각자 `auth.getUser()`를 불러 똑같은 왕복을 한 번 더 하고 있었습니다(거의 모든 화면에서 화면 하나당 왕복 1번씩 추가). Next.js 미들웨어가 검증을 마친 뒤 응답 헤더로 사용자 id를 실어 페이지에 넘기는 방식(`x-chaeksup-user-id`, `lib/supabase/verified-user.ts`의 `getVerifiedUserId()`)으로 바꿔서, 페이지는 미들웨어가 이미 검증한 값을 헤더에서 읽기만 하면 됩니다. 클라이언트가 이 헤더를 직접 위조해서 보내더라도 미들웨어가 항상 먼저 지우고 검증된 값으로만 다시 채우므로 안전합니다(이 미들웨어를 반드시 거치는 모든 페이지·API 라우트에 적용됨). 서버 컴포넌트 12곳 + API 라우트 2곳을 이 방식으로 바꿨고, 클라이언트 컴포넌트(브라우저에서 직접 Supabase를 호출하는 곳, 예: `library/add`, `onboarding`, `question-prompt` 등)는 애초에 이 미들웨어를 거치지 않으므로 손대지 않았습니다.
  - `proxy.ts` 자체도 이 김에 정리했습니다: 리다이렉트 분기마다 따로 `return`하던 걸 한 곳(`redirectTo`/`markOnboarded` 변수)으로 모았는데, 그 과정에서 기존 버그도 하나 같이 고쳐졌습니다 — 예전 코드는 세션 갱신으로 새로 발급된 쿠키나 `chaeksup_onboarded` 캐싱 쿠키가 리다이렉트 응답에는 안 실리는 경우가 있었습니다(리다이렉트 직전에 만든 `NextResponse.redirect(...)`가 쿠키를 담고 있던 `response` 변수와 다른 객체라서). 지금은 리다이렉트든 통과든 마지막에 한 번만 응답을 만들고 거기에 쿠키를 얹습니다.
  - `app/more/page.tsx`는 화면에 이메일도 보여줘야 하는데, `auth.getUser()`의 `user.email` 대신 `public.users.email`(가입 시 트리거로 이미 복제돼 있음)을 같은 조회에 얹는 방식으로 바꿔서 이 페이지도 예외 없이 적용했습니다.
- **교사/큐레이터 대시보드의 N+1 쿼리 제거**: `app/teacher/page.tsx`, `app/teacher/children/page.tsx`, `app/teacher/assignments/page.tsx`, `app/curator/page.tsx` 네 화면 모두 그룹마다(때로는 숙제마다) 따로 쿼리를 날리는 반복문으로 짜여 있었습니다(그룹이 5개면 왕복이 10~15번). 그룹 id 목록으로 한 번에 조회한 뒤 자바스크립트에서 그룹별로 묶는 방식으로 바꿔서, 그룹이 몇 개든 왕복 횟수가 고정되게 했습니다. **이 과정에서 실제 버그를 하나 발견해 고쳤습니다**: `teacher/children/page.tsx`의 완료 통계를 배치 쿼리로 바꾸면서 처음엔 `child_id`만으로 필터링했는데, 같은 아이가 여러 그룹에 속해 있으면 다른 그룹 숙제 완료 통계까지 섞여 들어가는 문제가 있었습니다(원래 순차 코드는 그룹별 루프 안에서 그 그룹의 숙제 id로만 필터링해서 이 문제가 없었음) — `assignment_id → group_id` 매핑을 만들어 그룹별로 정확히 나누도록 고쳤습니다.
- **`recommend`/`recommend/[groupId]` 페이지도 서로 무관한 조회들을 `Promise.all`로 묶었습니다**(예: 그룹 상세 페이지는 그룹 정보/내 멤버십/활성 아이/책 목록 네 개를 동시에, 그 다음 단계로 분야/책장 여부/승인 대기/숙제 네 개를 다시 동시에 왕복하도록).
- **코드 정리**: `TYPE_LABELS`(그룹 유형 → 한글 라벨)가 `app/teacher/page.tsx`, `app/curator/page.tsx`, `app/recommend/page.tsx`, `app/recommend/[groupId]/page.tsx` 네 파일에 토씨 하나 안 틀리고 복붙돼 있던 걸 `lib/group-labels.ts`의 `GROUP_TYPE_LABELS` 하나로 모았습니다.
- **의도적으로 하지 않은 것**:
  - **캐싱(fetch 캐시/`unstable_cache`/ISR)**: 독서기록·숙제 완료 현황처럼 화면에 뜨는 데이터 대부분이 사용자별로 실시간에 가깝게 바뀌어야 해서(부모가 방금 남긴 기록이 바로 안 보이면 그게 더 큰 문제), 섣불리 캐싱하면 오래된 정보가 보일 위험이 이득보다 큽니다. 유일하게 캐싱해도 안전한 건 이미 쿠키로 캐싱해둔 `onboarding_completed` 정도였고, 그건 전에 처리했습니다.
  - **Vercel/Supabase 리전, 호스팅 교체**: "다른 저장소를 쓰더라도"라는 질문에는, 코드로 확인·수정할 수 있는 영역이 아니라서 답변으로만 안내했습니다 — Vercel 프로젝트와 Supabase 프로젝트가 같은/가까운 리전인지 각 대시보드에서 확인이 필요하고(리전이 멀면 이번에 줄인 왕복 횟수와 별개로 왕복 1번당 지연이 큼), 무료(Hobby/Free) 플랜이면 콜드 스타트·커넥션 제한이 있어 유료 전환도 고려할 만합니다. Supabase 대신 다른 DB로 옮기는 건 이번 왕복-횟수 문제와는 무관하고(어떤 DB든 네트워크 왕복 자체는 발생) RLS 전체를 다시 설계해야 하는 큰 작업이라 권하지 않았습니다.
- **배포 직후 콜드 스타트 문의**: 위 변경을 배포한 직후 탭 전환이 오히려 느려 보인다는 스크린샷을 받았습니다. `proxy.ts`가 거의 모든 요청에 실행되는데, Next.js 16부터 Proxy(구 미들웨어)가 Edge가 아니라 Node.js 런타임에서 기본 동작해서, 배포 직후 첫 요청들은 서버 함수가 새로 뜨는 콜드 스타트 지연을 탈 수 있다고 답변했습니다. 실제로 왕복 횟수 자체는 줄었으니(이중 인증 검증 제거) 몇 분 뒤 다시 확인해보도록 안내했고, 이후 사용자가 별도로 재확인 없이 다음 요청(기록 고치기 사진/음성 관련)으로 넘어가서 이 시점 기준으로는 해결된 것으로 보입니다.
- **진짜 원인은 리전 불일치였습니다**: 왕복 횟수를 최소로 줄인 뒤에도 탭 전환마다 3~5초 빈 화면이 계속된다는 신고를 받고, 코드로는 더 줄일 왕복이 없다고 판단해 Vercel/Supabase 리전을 확인해달라고 요청했습니다. Supabase는 처음부터 서울(ap-northeast-2)이었는데 Vercel 서버 함수는 미국 리전으로 배포되고 있었던 게 확인됐습니다 — 왕복 "횟수"는 최소화했어도 왕복 "한 번"이 태평양을 건너느라 300~600ms씩 걸리면 그게 쌓여 3~5초가 나올 수 있다는 게 실제 원인이었습니다. 사용자가 Vercel 대시보드에서 리전을 서울로 바꾸는 동안, `vercel.json`에 `"regions": ["icn1"]`을 추가해 재배포해도 서울 리전이 코드로 고정되도록 했습니다. "다른 저장소(Firebase/GCP 등)로 바꾸면 빨라지냐"는 질문에는, 브랜드가 아니라 리전이 핵심이라 — 그 서비스들도 미국 리전에 두면 똑같이 느리고, Supabase 그대로 두고 Vercel 리전만 맞추는 게 인증/RLS/스토리지를 통째로 새로 짜야 하는 마이그레이션보다 훨씬 적은 작업으로 같은 효과를 낸다고 답변했습니다.
- **리전을 맞춘 뒤에도 로딩 스켈레톤이 "허옇게 반짝"인다는 피드백**: 리전 이전으로 실제 전환이 훨씬 빨라지고 나니(수 초 → 수백ms), 오히려 각 라우트의 `loading.tsx`(회색 펄스 스켈레톤, 흰 카드 모양 placeholder)가 화면에 아주 잠깐 나타났다 사라지는 게 눈에 거슬리는 흰색 깜빡임처럼 느껴진다는 지적을 받았습니다. `components/loading-skeleton.tsx`에 지연된 페이드인(`opacity: 0`으로 시작해 150ms 뒤부터 150ms에 걸쳐 서서히 나타나는 CSS 애니메이션, `app/globals.css`의 `skeleton-delayed-fade-in` 키프레임)을 추가해서, 150ms 안에 끝나는 빠른 전환에서는 스켈레톤이 아예 화면에 그려지기 전에 실제 내용으로 바뀌어 안 보이고, 그보다 오래 걸리는 전환에서만 부드럽게 나타나도록 했습니다.

## 기록 고치기 모달에 사진·음성 수정 기능 추가 (실사용 피드백 반영)

기록 남기기(`app/library/add`) 화면에는 사진 촬영/음성 녹음이 있는데, 이미 저장된 기록을 나중에 고치는 `RecordEditModal`에는 이 기능이 아예 없었습니다("기록 고치기 누를때는 사진이나 녹음 수정 안뜨네"). 초기 기록과 동일한 기능을 갖추도록 모달을 확장했습니다.

- **`EditableRecord`에 `childId`/`childName`/`photoPath`/`voicePath` 추가**: `photoPath`/`voicePath`는 서명 안 된 원본 `reading_records.photo_url`/`voice_url` 값입니다. 목록 화면(책장/기록/오늘/오늘의 숙제)마다 미리 서명해두면 카드가 많을 때 그만큼 왕복이 늘어나므로, 모달이 실제로 열릴 때(useEffect on mount)만 `getSignedMediaUrl()`로 직접 서명합니다 — 이번 속도 개선 작업의 원칙(왕복은 꼭 필요한 시점에만)과 같은 방향입니다. 이 값을 채우려면 `app/library/page.tsx`(+`components/library-shelf.tsx`), `app/today/page.tsx`(+`components/recent-records.tsx`), `lib/assignments.ts`(+`components/assignment-today.tsx`) 세 조회 경로의 `reading_records` select에 `photo_url, voice_url`을 추가했습니다. `app/records/page.tsx`(+`components/records-list.tsx`)는 목록에서 이미 사진/음성을 인라인으로 보여주고 있어서 원래도 서명된 값을 갖고 있었는데, 그 서명 안 된 원본 경로도 같이 넘기도록만 추가했습니다.
- **`components/photo-picker.tsx`/`components/voice-recorder.tsx`에 `existingUrl`/`onRemoveExisting` prop 추가**: 원래는 "새로 파일 선택"만 지원하는 컴포넌트였는데, 이미 업로드된 사진/음성이 있을 때 그걸 보여주고 "바꾸기"(새 파일 선택기 다시 염) 또는 "지우기"(`onRemoveExisting` 호출)를 할 수 있게 상태를 하나 더 추가했습니다. 기록 남기기 화면(항상 새로 첨부하는 경우)은 이 prop들을 안 넘기므로 동작이 그대로입니다.
- **저장 시 부분 업데이트**: 사진/음성을 안 건드렸으면 `reading_records.update()` 페이로드에 `photo_url`/`voice_url` 키 자체를 아예 안 넣어서 기존 값이 그대로 유지되도록 했습니다(새로 파일을 골랐을 때만 업로드 후 그 경로로, 지웠을 때만 `null`로 채웁니다) — 매번 무조건 포함시키면 라이브러리 화면처럼 여러 값을 조합해서 만든 `EditableRecord`에서 원본 경로를 잘못 덮어쓸 여지가 있어 이 방식이 더 안전합니다.

## 하단 탭 재편(배지 → 숙제) + 기록 탭 압축 + 팔로우 상태 표시 (사용자 요청)

- **배지를 상단으로, 숙제를 하단 탭으로**: `components/top-bar.tsx`의 '더보기' 아이콘 옆에 배지 아이콘을 하나 더 추가했습니다(부모 계정에서만, `role === "parent"` 조건). 그 빈자리에 숙제를 새 하단 탭으로 넣어서, 부모 탭 구성이 **오늘 · 책장 · 기록 · 추천 · 숙제**가 됐습니다. 숙제 탭 아이콘은 교사용 `AssignmentIcon`을 그대로 재사용했습니다(경로만 다름 — 교사는 `/teacher/assignments`, 부모는 `/assignments`).
- **숙제 탭 신설(`app/assignments`)**: 기존 `/today/assignments`(오늘 숙제 상세)를 대체하는 자리로, `lib/assignments.ts`의 `getTodayAssignments()`를 조회 범위별로 세 함수로 나눴습니다 — 내부 공용 `fetchAssignments(scope)`에 `"current"`(기존 오늘 탭 요약과 완전히 동일한 동작, 회귀 없음)/`"current_and_upcoming"`(시작일 제약 없이 아직 안 끝난 숙제 전부 — 숙제 탭 기본 화면)/`"past"`(마감일이 지난 것만 — `/assignments/past`) 세 가지를 파라미터로 넘깁니다. `components/assignment-today.tsx`는 그룹별로 섹션을 나눠 보여주도록 고쳤습니다(그룹명을 카드마다 반복하지 않고 섹션 헤더 한 번만). 오늘 탭 요약의 "전체 보기"와 각 숙제 링크(`#assignmentId`)도 전부 `/assignments`로 바꿨습니다.
- **기록 탭을 "다 읽은 책 로그"로 좁힘**: 사용자가 기록 탭을 "다 읽은 책에 대한 기록"으로 명확히 정의해서, `app/records/page.tsx`의 조회에 `status='done'` 필터를 추가했습니다(읽고 싶은 책/읽는 중인 책은 책장 탭의 상태 필터에서만 봄). 각 행도 사진·음성 인라인 미리보기, 평점·기분·메모 텍스트, 즐겨찾기 표시를 다 빼고 **아주 작은 표지(44×32px) + 제목 + 그룹명(아주 작게) + 날짜(M/D)** 한 줄로 압축했습니다(`components/records-list.tsx`). 이제 목록에서 사진/음성을 안 보여주므로, `app/records/page.tsx`가 모든 기록에 대해 미리 서명된 URL을 만들던 것도 없앴습니다(모달이 열릴 때만 서명하는 이번 세션의 다른 개선과 같은 방향 — 목록 렌더링 자체가 훨씬 가벼워짐).
- **팔로우 → 팔로잉**: `components/browse-groups.tsx`의 "팔로우 중" 라벨을 "팔로잉"으로 바꿨고, 실제 버그도 하나 고쳤습니다 — 그룹 상세 화면(`app/recommend/[groupId]/page.tsx`)이 `!isMember`일 때만 팔로우 UI를 렌더링해서, 이미 팔로우한 뒤에는 팔로우 버튼도 "팔로잉" 표시도 아무것도 안 뜨고 그냥 사라졌습니다. `isMember` 조건을 빼고 `followingIds`를 실제 멤버십 여부로 넘기도록 고쳐서, 팔로우한 뒤에도 "팔로잉"이 계속 보이게 했습니다.
- **책 기록하기 버튼 색상**: `app/records/page.tsx`, `app/today/page.tsx`의 "+ 책 기록하기" 버튼 배경을 `var(--lantern)`(호박색)에서 `var(--berry)`(#D94A32)로 바꿨습니다. 숙제 관련 강조에 쓰이는 다른 lantern 색상(교사 승인 대기 건수, 숙제 미완료 배지, 책장/기록의 "읽고 싶어요"/"읽는 중" 상태 배지 등)은 그대로 뒀습니다 — 사용자가 지목한 건 "책 기록하기" 버튼만이었습니다.

## 기록 중복 저장 방지 + 기록 삭제 기능 (실사용 피드백 반영)

같은 책("하마는 병원에 갈까")이 같은 날짜·같은 그룹으로 기록 탭에 두 번 뜬다는 신고를 받았습니다. `assignment_completion` 뷰가 `child_id`+`book_id`만으로 완료 여부를 판정하기 때문에(어느 숙제를 통해 완료했는지는 안 따짐), 한 숙제에서 완료하면 같은 책이 걸린 다른 숙제 카드도 즉시 "읽었어요"(기존 기록을 여는 버튼)로 바뀌는 구조라 — 정상적인 화면 흐름으로는 두 번째 기록이 새로 만들어지지 않습니다. 그래서 가장 유력한 원인은 **저장 버튼을 빠르게 두 번 누른 것**으로 판단했습니다: `saving` state로만 버튼을 막으면 React가 리렌더링해서 버튼이 실제로 disabled 되기까지 짧은 틈이 있고, 그 사이에 두 번째 탭이 들어가면 `save()`가 두 번 실행됩니다(아이가 화면을 여러 번 두드리는 경우 특히 취약).

- **`app/library/add/page.tsx`**: `savingRef`(useRef)를 추가해 `save()` 맨 앞에서 동기적으로 체크·설정하도록 고쳤습니다 — state 업데이트를 기다리지 않아 정말로 한 번만 저장됩니다. 겸사겸사 반복되던 `setSaving(false); return;` 패턴을 `try/finally`로 정리했습니다(로직 변경 없이 정리만).
- **기록 삭제 기능이 아예 없었습니다**: 이미 생긴 중복(또는 잘못 남긴 기록)을 지울 방법이 앱 안에 없어서, `components/record-edit-modal.tsx`에 "이 기록 삭제하기" 버튼을 추가했습니다(`window.confirm`으로 한 번 확인, `reading_records` DELETE — 기존 "guardians manage own child's records" RLS 정책이 `for all`이라 DELETE도 이미 허용되어 있었습니다). 이제 책장/기록/오늘/숙제 어디서 기록 고치기 모달을 열어도 삭제할 수 있습니다.
- **기록 탭을 책 단위로 합치거나(중복 제거) 재독 횟수를 세는 건 이번엔 하지 않았습니다**: 사용자가 "중복을 없앨까?"라고 물었지만, 기록 탭은 최근에 의도적으로 "각 읽은 사건을 있는 그대로 보여주는 로그"로 재정의했고(책 단위로 합치는 건 책장 탭의 역할), 정말 두 번 읽었다면 두 번 뜨는 게 맞는 동작입니다. 재독 횟수 카운터는 이전에도 별도 데이터 모델이 필요하다고 판단해 미뤄둔 기능이라, 이번엔 손대지 않고 원인 진단 + 실수를 막는 가드 + 삭제 기능으로 대응했습니다.
- **기록 삭제 버튼을 회색 박스 버튼으로**: "이 기록 삭제하기"가 빨간 텍스트 링크라 눈에 잘 안 띈다는 피드백으로, "기록 저장하기" 버튼과 같은 크기의 테두리 있는 회색 버튼(`--rule` 테두리, `--ink-2` 글자색)으로 바꿨습니다.

## 오늘의 숙제가 완료돼도 안 사라지던 문제 (실사용 피드백 반영)

"지난 숙제도 계속 떠서"라는 신고를 받고 확인해보니, 오늘 탭의 "오늘의 숙제" 요약은 순수하게 **날짜만** 보고 있었습니다(`getTodayAssignments`가 `start_date`/`end_date` 범위로만 필터링, 완료 여부는 전혀 안 봄). 교사가 숙제를 만들 때 마감일(`end_date`)을 안 정하면 그 숙제는 날짜 조건상 "영원히 진행 중"으로 남아서, 책을 전부 다 읽어 사실상 끝난 숙제도 오늘 탭에 계속 떠 있었습니다. `app/today/page.tsx`에서 `getTodayAssignments()` 결과 중 책이 전부 완료된 숙제를 걸러내는 `activeAssignments` 필터를 추가해서, 오늘 탭 요약에는 "아직 할 일이 남은" 숙제만 보이도록 고쳤습니다. 숙제 탭(`/assignments`)은 의도적으로 손대지 않았습니다 — 거기는 "관리" 화면이라 완료된 숙제도 계속 보이는 게 맞습니다(완료 여부는 이미 "N/M 완료" 배지로 구분됨).

## 추천 탭과 숙제 탭의 역할 분리 (사용자 요청)

두 탭이 그룹 상세 화면(`/recommend/[groupId]`)에서 겹치고 있었습니다 — 추천도서도 여기, 부모가 보는 숙제 목록도 여기. 사용자 요청에 따라 역할을 명확히 나눴습니다: **추천 탭**은 순수하게 "기관·인플루언서를 둘러보고 팔로우하고, 그들의 추천도서를 내 책장에 골라 담는" 발견/탐색 화면으로, **숙제 탭**은 "내가 속한 그룹을 골라서(드롭다운) 그 그룹의 추천도서 + 숙제를 한 화면에서 관리하는" 화면으로 재정의했습니다.

- **`lib/recommend-books.ts` 신설**: 그룹 하나의 추천도서 목록(+분야, 책장 보유 여부) 조회 로직을 `/recommend/[groupId]/page.tsx`에서 빼내 `getRecommendBooks(supabase, groupId, childId)`로 공유합니다. 숙제 탭에서 그룹을 선택했을 때도 똑같은 함수·컴포넌트(`RecommendBookList`)를 재사용합니다. `RecommendBook` 타입도 이 파일로 옮기고 `components/recommend-book-list.tsx`는 재수출만 합니다.
- **`/recommend/[groupId]/page.tsx`에서 부모용 숙제 목록 제거**: 기존엔 이 화면 맨 아래에 그 그룹의 숙제 카드 목록이 부모/교사 모두에게 보였는데, 이제 부모가 숙제를 보는 곳은 숙제 탭 하나로 통일했습니다. 교사(운영진)의 "숙제 만들기" 폼(`CreateAssignment`)만 이 화면에 남겨뒀습니다(교사가 그룹을 관리하며 새 숙제를 만드는 자연스러운 자리라서). 이 화면에서 숙제 목록을 조회하던 쿼리 자체를 없애서 왕복도 하나 줄었습니다.
- **`components/group-filter-select.tsx` 신설**: 숙제 탭 상단의 그룹 드롭다운. 선택 상태를 클라이언트 state가 아니라 URL 쿼리(`?group=<id>`)로 저장해서, 서버 컴포넌트가 선택된 그룹에 맞는 데이터를 그대로 다시 렌더링합니다(그룹 전환도 일반 네비게이션이라 로딩 스켈레톤이 자연스럽게 뜸).
- **`app/assignments/page.tsx` 개편**: 그룹 드롭다운(아이가 속한 전체 그룹 목록, `group_members` 조회) → (그룹을 골랐으면) 그 그룹의 "추천도서" 섹션을 숙제 위에 → "숙제" 섹션 순서로 배치했습니다("숙제 위에 올려서"라는 요청 그대로). 그룹을 안 고르면(기본값 "전체 그룹") 기존처럼 모든 그룹의 숙제를 그룹별 섹션으로 묶어서 보여주고 추천도서 섹션은 생략합니다. "지난 숙제 보기" 링크도 선택된 그룹을 쿼리로 이어받습니다.
- **`app/assignments/past/page.tsx`도 같은 그룹 드롭다운 추가**: 지난 숙제 목록도 그룹별로 좁혀볼 수 있게 일관성을 맞췄습니다.

## 숙제 탭 그룹 드롭다운에 도서관이 중복으로 뜨던 버그 (실사용 피드백 반영)

"숙제 그룹 선택에 haba뿐만 아니라 도서관도 뜨고, 도서관이 여러 번 중복으로 떠"라는 신고를 받았습니다. 도서관(국립어린이청소년도서관 NLCY 큐레이터 그룹)이 목록에 뜨는 것 자체는 의도한 동작입니다 — 바로 전 항목에서 "숙제 탭의 그룹 드롭다운은 아이가 속한 모든 그룹(추천도서를 보기 위해)을 보여준다"고 사용자가 직접 요청했고, 아이가 이미 그 그룹을 팔로우하고 있었기 때문입니다. 진짜 버그는 **중복**이었습니다.

- **원인**: `group_members` 테이블에 `(group_id, child_id)`/`(group_id, user_id)` 조합의 유니크 제약이 전혀 없었습니다. `components/browse-groups.tsx`의 팔로우 버튼과 `components/join-by-code.tsx`의 가입 버튼 둘 다, `library/add` 저장 버튼에서 이미 한 번 겪었던 것과 같은 경쟁 상태를 갖고 있었습니다 — React `useState`로만 버튼을 disabled 시켰는데, state 업데이트가 리렌더링을 기다리는 동안 버튼을 빠르게 두 번 누르면(특히 아이가 여러 번 두드리는 경우) `group_members` insert가 두 번 나가서 같은 그룹에 대해 승인된 행이 두 개 생길 수 있었습니다. `app/assignments/page.tsx`/`app/assignments/past/page.tsx`의 그룹 드롭다운은 이 중복 행들을 그대로 옵션으로 나열하고 있었습니다.
- **마이그레이션 0015**: 기존 중복(그룹+아이, 그룹+운영진 조합별로 승인된 행을 우선하고 그다음 가장 먼저 신청한 순으로 하나만 남김)을 정리한 뒤, `(group_id, child_id)`와 `(group_id, user_id)`에 각각 부분 유니크 인덱스(null이 아닌 쪽만)를 추가했습니다. `group_members`의 승인/거절(`components/group-approvals.tsx`)은 항상 기존 행을 update하지 새 행을 insert하지 않으므로, 한 그룹에 대해 같은 아이/운영진이 여러 행을 가질 정당한 시나리오가 없다는 걸 확인하고 하드 제약으로 걸었습니다. 로컬 Postgres에 중복 행을 수동으로 만들어 마이그레이션이 승인된 행을 남기고 정리하는지, 그 뒤엔 중복 insert가 실제로 막히는지 확인했습니다.
- **`browse-groups.tsx`/`join-by-code.tsx`에 동기 가드 추가**: `library/add`의 `savingRef`와 같은 패턴으로 `useRef` 가드를 추가해 연타 자체를 막았습니다. 그래도 혹시 뚫고 들어온 요청은 DB가 유니크 제약(에러 코드 `23505`)으로 막아주는데, 이 경우는 에러로 표시하지 않고 "이미 팔로우/가입돼 있다"는 뜻으로 조용히 처리하도록 했습니다(사용자에게 에러 메시지 대신 정상 팔로우 상태로 보이게).
- **그룹 드롭다운에 방어적 dedupe 추가**: DB 제약으로 미래의 중복은 막았지만, `app/assignments/page.tsx`/`app/assignments/past/page.tsx`의 `myGroups` 조합 로직에도 `app/recommend/page.tsx`가 이미 쓰던 것과 같은 `findIndex` 기반 dedupe를 추가해 한 번 더 방어했습니다.

## '추천' 탭 제거 + '숙제' 탭을 '숲길'로 통합, 박스 과다 정리 (실사용 피드백 반영)

그룹 상세 화면 스크린샷을 보고 "'추천'이란 메뉴가 불필요하지 않아? 추천은 숙제 메뉴 안에서 설정하면 되지 않아? 숙제란 이름도 바꿔야 할 것 같아"라는 피드백을 받았습니다. 바로 전 항목에서 추천 탭과 숙제 탭의 역할을 나눴는데, 실제로 써보니 숙제 탭이 이미 그룹별 추천도서까지 보여주고 있어서 별도 추천 탭이 군더더기로 느껴진다는 지적이었습니다. 새 탭 이름과 "안 속한 그룹을 찾는 기능을 어디로 옮길지"는 사용자가 직접 고를 문제라 `AskUserQuestion`으로 확인했고, **"숲길"**(탭 이름)과 **"더보기 화면으로"**(그룹 둘러보기 이동 위치)를 선택받았습니다.

- **하단 탭 재편**: `components/bottom-nav.tsx`의 `PARENT_TABS`에서 `/recommend`(추천) 항목을 없애고, `/assignments`의 라벨을 "숙제"에서 "숲길"로 바꿨습니다. 부모 탭이 오늘·책장·기록·추천·숙제(5개)에서 **오늘·책장·기록·숲길**(4개)로 줄었습니다. 교사/큐레이터 탭은 원래도 `/recommend`를 "그룹"이라는 이름으로 쓰고 있어서(부모 탭만 "추천"이라는 다른 이름을 썼던 것) 그대로 뒀습니다.
- **그룹 둘러보기를 더보기로 이동**: `app/more/page.tsx`에 부모 역할일 때만 보이는 "그룹 둘러보기" 섹션(→ `/recommend`로 가는 "새 그룹 찾기" 링크)을 추가했습니다. `/recommend/page.tsx` 자체의 내용(내 그룹 목록 + 공개 그룹 둘러보기 + 초대 코드 참가)은 손대지 않았고, 교사/큐레이터의 "그룹" 탭이기도 하므로 그대로 유지했습니다. `/recommend/[groupId]/page.tsx`의 "← 추천"/"추천 탭으로" 문구도 이제 부모에게는 탭이 아니라 더보기를 거쳐 오는 화면이라 역할 중립적인 "← 그룹 목록"/"그룹 목록으로"로 바꿨습니다.
- **추천도서 목록: 분야별 박스 → 박스 하나 + 구분선**: "박스들이 너무 많아. 추천도서 박스, 숙제 박스. 내용은 그 안에서 구분하면 될 거 같은데"라는 지적을 반영해, `components/recommend-book-list.tsx`가 분야(카테고리)마다 따로 만들던 흰 박스(`rounded-[var(--r)] border`)를 없애고 전체 목록을 박스 하나에 담았습니다. 분야 이름은 이제 그 박스 안의 옅은 배경(`--paper`) 소제목 행으로만 표시되고, 분야 사이·책 사이는 `border-top` 구분선으로만 나뉩니다(records-list.tsx/assignment-summary.tsx에서 이미 쓰던 "박스 하나 + 구분선" 패턴과 동일).
- **숙제 목록도 같은 패턴으로**: `components/assignment-today.tsx`가 그룹 안에 숙제가 여러 개일 때 숙제마다 따로 박스를 만들던 것도 없애고, 그룹당 박스 하나 + 숙제 사이 구분선으로 바꿨습니다. 이 컴포넌트는 숲길 탭(`/assignments`, `/assignments/past`)에서 공유해서 쓰므로 두 화면 모두에 적용됩니다.
- **의도적으로 안 바꾼 것**: `/recommend/[groupId]/page.tsx`(그룹 상세 화면) 자체의 "추천도서"/"숙제 만들기" 섹션 구성은 그대로 뒀습니다 — 여기는 운영진이 관리하는 화면이라 박스 개수보다 기능이 우선이고, `RecommendBookList` 컴포넌트를 공유하므로 박스 정리 효과는 자동으로 반영됩니다.

## 글자 크기 위계 정리 + 오늘 탭 요약 재구성 (실사용 피드백 반영)

숲길 탭 스크린샷에 상단 타이틀("유안의 책숲")과 그 아래 섹션 소제목("Haba 7세반의 추천도서")을 원으로 표시하며 "글자 크기들이 너무 강약이 없다"는 지적을 받았습니다. 실제로 둘 다 `d text-lg`로 완전히 같은 크기였던 게 원인이었습니다(상단 타이틀은 `components/top-bar.tsx`가 전역에 고정으로 띄우는 것이라 화면마다 반복되는 섹션 소제목과는 다른 위계여야 하는데, 코드상 구분이 없었습니다).

- **3단계 위계로 정리**: "제목(유지) > 소제목 > 내용"이라는 사용자 지정에 따라, `components/top-bar.tsx`의 앱 전역 타이틀만 `d text-lg`를 유지하고 나머지 화면 곳곳의 섹션 소제목(오늘의 숙제/최근 기록/추천도서/숙제 만들기/그룹 둘러보기/아이 관리 등, 총 8개 파일)은 전부 `d text-base`로 한 단계 낮췄습니다. 온보딩 마법사(`app/onboarding/page.tsx`)는 이 화면 전용 흐름이라 이번 정리 대상에서 뺐습니다.
- **소제목을 낮추며 생긴 충돌도 같이 정리**: 소제목이 `text-lg`→`text-base`로 내려오면서 그 아래 있던 `text-base` 내용 텍스트와 크기가 같아지는 곳이 몇 군데 있었습니다(`components/record-edit-modal.tsx`의 책 제목·"OO의 기록" 카드 헤더, `components/assignment-today.tsx`의 숙제 설명·책 제목, `app/today/page.tsx`의 "지금 진행 중인 숙제가 없어요" 안내문). 전부 한 단계 더 낮춰(`text-sm`) 제목 > 소제목 > 내용 순서가 실제로 지켜지도록 했습니다.
- **오늘 탭 요약 박스 재구성**: "오늘 메뉴가 가장 중요한데 그러질 못한다"는 지적으로, 레거시 "유안이 독서 기록" 화면(총 읽은 책 수를 큰 숫자로 먼저 보여주고 그 아래 하위 통계, 기록 버튼은 그 밑)을 참고해 순서를 바꿨습니다. `app/today/page.tsx`에서 "+ 책 기록하기" 버튼을 요약 박스 아래로 내리고, 요약 박스 자체를 "읽은 책 N권"(큰 숫자) + 구분선 + 4칸 통계 그리드(오늘/이번 주/이번 달/그룹)로 다시 짰습니다. 레거시의 "최장 연속"/"표지"/"HABA 100" 칸은 지금 데이터 모델과 안 맞아서 빼고, 사용자가 지정한 오늘·이번 주·이번 달·그룹 수로 교체했습니다("그룹" 칸은 승인된 `group_members` 개수이고, 누르면 숲길 탭으로 이동합니다). 이번 주 계산은 `lib/badges.ts`의 "이번 주" 배지가 이미 쓰던 월요일 시작 공식을 그대로 재사용했습니다. 더 이상 쓰이지 않는 최장 연속(streak) 계산 코드는 지웠습니다.
- **오늘 탭 인사말도 소제목 서체로**: 요약 박스 위 "{아이 이름}, 오늘도 책숲을 걸어볼까요?" 인사말이 `text-sm`에 `--ink-2`(옅은 회색) 스타일이라 다른 소제목(`d text-base`, 진한 `--ink`)과 서체·색이 달라 보인다는 지적으로, 같은 `d text-base` 스타일로 맞췄습니다.
- **오늘 탭 섹션 사이에 연한 구분선 추가**: "+ 책 기록하기" 버튼과 "오늘의 숙제" 사이, "오늘의 숙제" 박스와 "최근 기록" 사이가 여백만으로 나뉘어 있어 소메뉴 간 경계가 잘 안 보인다는 지적으로, 앱 곳곳에서 이미 쓰던 옅은 구분선(`rgba(38,54,43,0.08)`, `border-top`)을 두 지점에 추가했습니다(`app/today/page.tsx`).

## 책장 필터 두 줄 → 가로 스크롤 한 줄 + 고정 라벨 (실사용 피드백 반영)

"출처" 필터 칩(전체/직접 기록/그룹명들)은 가로 스크롤 한 줄인데, 바로 아래 "상태" 필터 칩(전체/읽고 싶어요/읽는 중/다 읽음)은 `flex-wrap`이라 자리를 차지하며 두 줄로 꺾이는 게 일관성이 없다는 지적을 받았습니다. `components/library-shelf.tsx`의 상태 필터도 출처 필터와 같은 `overflow-x-auto` 한 줄 가로 스크롤로 바꿨습니다(정렬 드롭다운은 스크롤 영역 밖에 그대로 고정).

겸사겸사 "필터가 두 가지인데 각각 왼쪽에 구분 기준명을 고정으로 넣어달라"는 요청도 반영해, 두 필터 줄 맨 왼쪽에 스크롤되지 않는 라벨(`출처`, `상태`)을 `flex-none`으로 고정했습니다. 라벨이 새로 생겼으니 출처 필터의 "전체 출처" 칩 문구는 "출처: 전체"처럼 겹쳐 보이지 않도록 "전체"로 줄였습니다(상태 필터의 "전체"는 원래도 겹치는 문구가 없어 그대로 뒀습니다).

## 상태 필터 문체 통일 + 전체 버튼 제거(토글 방식) (실사용 피드백 반영)

"읽고 싶어요"(문장형)와 "읽는 중"/"다 읽음"(단어형)이 섞여 있어 문체가 안 맞는다는 지적, 그리고 "전체" 버튼을 없애고 이미 눌린 칩을 다시 누르면 선택이 풀리는 토글 방식으로 바꿔달라는 요청을 반영했습니다.

- **문체 통일**: `components/library-shelf.tsx`의 상태 라벨(필터 칩·표지 배지 공용, 이제 `STATUS_LABELS` 하나로 합침)을 `library/add`·`record-edit-modal`이 이미 쓰던 문장형("~요")으로 맞췄습니다 — "읽는 중" → "읽는 중이에요", "다 읽음" → "다 읽었어요".
- **"전체" 버튼 제거 + 토글 방식**: 출처 필터의 "전체", 상태 필터의 "전체" 버튼을 UI에서 뺐습니다(내부 상태값 `"all"`은 필터 초기값으로는 그대로 씁니다). 대신 각 칩의 `onClick`이 `현재 선택값 === 이 칩이면 "all"로, 아니면 이 칩으로` 토글하도록 바꿔서, 이미 선택된 칩을 다시 누르면 전체 보기로 돌아갑니다.

## 책장 헤더 정리 — 발자국 줄 제거 + 책 등록 버튼 이동 (실사용 피드백 반영)

책장 탭 맨 위에 있던 "{아이 이름}의 발자국 N개 · 배지 보기"(발자국 아이콘 + `/badges` 링크) 줄이 불필요하다는 지적을 받았습니다(배지는 이미 상단 `TopBar`에 항상 떠 있는 아이콘으로 갈 수 있어서 여기서 중복). 같은 줄 오른쪽에 있던 "+ 책장에 책 꽂기" 버튼도 검색창이 있는 줄로 내려서 "+책"으로 줄여달라는 요청을 반영했습니다.

- **`app/library/page.tsx`**: 발자국/배지 링크 줄을 없애고, 그 자리를 "{책장에 있는 책 수}권" + 옅은 가로 구분선(`h-px flex-1`, `rgba(38,54,43,0.08)`)으로 바꿨습니다. 더 이상 안 쓰는 `footprintCount`/`doneBookIds` 계산도 같이 지웠습니다. "+ 책장에 책 꽂기" 버튼은 `LibraryShelf`(검색창이 있는 화면)로 옮겨서, 책장이 비어 `LibraryShelf` 자체가 안 뜰 때를 위해 빈 책장 안내문 아래에 "+ 책"(같은 링크)을 별도로 남겨뒀습니다 — 안 그러면 책이 0권일 때 책을 등록할 방법이 화면에서 사라집니다.
- **`components/library-shelf.tsx`**: 검색창 + 책등/전면 보기 토글이 있던 줄에 "+ 책"(`/library/add`) 버튼을 세 번째 요소로 추가했습니다. 문구가 짧아져서 한 줄에 자연스럽게 들어갑니다.

## 책장 "N권" 요약을 필터 아래로 이동 + 필터 반영 (실사용 피드백 반영)

"N권" 요약이 필터 위에 있어서 필터를 걸어도 숫자가 안 바뀌는 게 어색하다는 지적으로, 위치와 계산 방식을 함께 고쳤습니다.

- **위치 이동**: `app/library/page.tsx`에 있던 정적 "N권 + 구분선" 줄(서버 컴포넌트라 필터 상태를 알 수 없어 `books.length` 고정값만 보여줬음)을 없애고, 같은 모양의 줄을 `components/library-shelf.tsx`의 출처/상태 필터 줄 바로 아래·책 그리드 바로 위로 옮겼습니다.
- **필터 반영**: 새 위치는 클라이언트 컴포넌트 안이라 검색어·출처·상태 필터가 전부 적용된 `filtered.length`를 그대로 쓸 수 있어서, 필터 칩을 누를 때마다 숫자가 즉시 따라 바뀝니다.

## 책장 상단 여백 제거 + 정렬 드롭다운 줄 분리 (실사용 피드백 반영)

"N권" 줄을 필터 아래로 옮기면서 `app/library/page.tsx`의 상단이 비게 됐는데, `components/library-shelf.tsx` 루트에 남아있던 `mt-6`이 페이지의 `pt-8`과 겹쳐 검색창 위에 불필요한 여백줄이 생겼습니다(스크린샷으로 지적받음). `mt-6`을 지워서 페이지의 `pt-8` 하나만 적용되게 했습니다.

같은 스크린샷에서 정렬 드롭다운("최신순")이 상태 필터 칩과 한 줄에 끼어 있는 것도 지적받아, 상태 필터 줄에서 분리해 그 아래 오른쪽 정렬의 새 줄로 옮겼습니다.

## 오늘 탭 요약 박스 통계 왼쪽 정렬 (실사용 피드백 반영)

오늘 탭 요약 박스의 4칸 통계(오늘/이번 주/이번 달/그룹)가 각 칸 안에서 가운데 정렬(`items-center`)이라, 박스 위쪽의 "읽은 책 10권"(왼쪽 정렬)과 정렬 기준이 안 맞아 시각적으로 들쭉날쭉하다는 지적을 스크린샷으로 받았습니다. 4칸 전부 `items-center`→`items-start`로 바꿔 숫자·라벨이 각 칸 왼쪽에 붙도록 통일했습니다.

## 손글씨 폰트 도입 + 폰트 사용 규칙 명문화 (실사용 피드백 반영)

"디자인이 전체적으로 통일감이 없고, 유아동 친화적이지 않고, 폰트가 제각각이고, 손글씨 요소가 없다"는 포괄적인 피드백을 받았습니다. 버튼·카드·필터 칩 등 구조적인 요소는 실제로 점검해보니 이미 대부분 일관돼 있었습니다(버튼은 거의 전부 `.d rounded-[14px] text-white` 패턴, 카드는 `rounded-[var(--r)]`, 칩은 `rounded-full`). 진짜 빠져 있던 건 디자인 원칙 문서에 처음부터 정의돼 있던 손글씨 폰트(`--hand`, Gamja Flower)가 **코드 어디에서도 실제로 쓰인 적이 없었다**는 점이었습니다 — grep으로 확인.

- **폰트 사용 규칙을 명문화**: `.d`(Gowun Dodum)는 구조적인 요소(제목·소제목·버튼 라벨·숫자 통계)에, `.hand`(Gamja Flower)는 따뜻하고 개인적인 문구(인사말·축하 메시지·빈 상태 격려·질문 프롬프트)에 쓰기로 정했습니다. 본문·메타 텍스트(설명, 날짜 등)는 계속 기본 시스템 폰트를 씁니다. 이 구분을 앞으로도 지키면 폰트가 "제각각"으로 보이는 문제가 구조적으로 재발하지 않습니다.
- **적용한 곳**: 오늘 탭 인사말("OO, 오늘도 책숲을 걸어볼까요?"), 기록 남기기 성공 메시지("책장에 기록됐어요!"), 오늘의 질문 프롬프트 본문, 배지 탭 인트로 문구("OO의 발자국이 모여 배지가 돼요"), 책장/기록 탭의 빈 상태 안내 문구. 색은 대체로 `--point-deep`(녹색)을 써서 따뜻하면서도 앱의 포인트 컬러와 맞물리게 했습니다.
- **일부러 안 건드린 곳**: 온보딩 마법사는 부모가 채우는 사무적인 흐름이라 이번 손글씨 적용 대상에서 뺐습니다. 숙제 안내·필터·통계 숫자처럼 정보 전달이 우선인 텍스트에는 손글씨체를 쓰지 않았습니다 — 남용하면 가독성이 떨어지고 손글씨 요소의 특별함도 옅어집니다.

## 오늘 탭 요약 박스 4칸 통계 가로 간격 균등화 (실사용 피드백 반영)

왼쪽 정렬로 바꾼 4칸 통계(오늘/이번 주/이번 달/그룹)를 확대 스크린샷으로 보니, `grid grid-cols-4`가 네 칸을 수학적으로는 25%씩 균등하게 나누지만 각 칸 안의 숫자가 왼쪽 정렬이라 실제 눈에 보이는 칸 사이 간격은 내용물 너비에 따라 들쭉날쭉해 보이고, 마지막 칸("그룹") 오른쪽에는 칸 자체의 남은 폭만큼 의미 없는 여백이 남는 문제가 있었습니다.

`app/today/page.tsx`에서 `grid grid-cols-4`를 `flex justify-between`으로 바꿨습니다 — 각 통계 항목이 내용물 너비만큼만 차지하고, 남는 공간을 항목 사이 간격에 균등하게 나눠 쓰면서 첫 항목은 박스 왼쪽 끝에, 마지막 항목은 박스 오른쪽 끝에 딱 붙습니다. 간격도 실제로 균등해 보이고 마지막 항목 뒤의 불필요한 여백도 사라집니다.

@AGENTS.md
