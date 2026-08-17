# 책숲

아이의 독서를 부모·교사, 그리고 책을 추천하는 기관·크리에이터가 함께 기록하고 넓혀가는 어린이 독서 플랫폼.

Next.js(App Router) + TypeScript + Supabase 기반. 자세한 제품/스키마 설계는 `CLAUDE.md`를 참고하세요.

이 저장소의 `legacy/index.html`은 서비스형으로 확장하기 전의 개인용 프로토타입("유안이 독서기록")으로, 디자인 시스템과 UI 참고용으로만 남겨둔 것이며 빌드에는 포함되지 않습니다.

## 로컬 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. `.env.example`을 복사해 `.env.local`을 만들고, Supabase 프로젝트의 **Settings → API**에서 값을 채웁니다.

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. `supabase/migrations`의 마이그레이션을 프로젝트에 적용합니다. [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)를 사용하는 경우:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

   CLI를 쓰지 않는다면 Supabase 대시보드의 **SQL Editor**에서 `supabase/migrations/0001_init_schema.sql`, `0002_rls_policies.sql`을 순서대로 실행해도 됩니다.

4. **Authentication → Providers**에서 이메일 로그인이 켜져 있는지 확인합니다. (기본값으로 켜져 있습니다.) 로컬 개발 중에는 **Authentication → Email**에서 "Confirm email"을 꺼두면 가입 즉시 로그인 테스트를 할 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다. `/`는 `/today`로 리다이렉트되며, 하단 5탭(오늘/책장/기록/추천/더보기) 네비게이션이 보여야 합니다.

### 4. 회원가입 → 로그인 → 로그아웃 확인

1. `/signup`에서 이메일/비밀번호로 가입합니다.
2. (이메일 확인을 켜둔 경우) 받은 메일의 링크를 클릭해 계정을 확인합니다.
3. `/login`에서 로그인합니다.
4. 하단 탭의 **더보기**에서 로그인한 이메일이 보이고, **로그아웃** 버튼이 동작하는지 확인합니다.

### 5. RLS 수동 검증

서로 다른 두 계정(예: 부모 A, 부모 B)으로 각각 아이(`children`)를 등록하고, `child_guardians`로 연결한 뒤:

- 부모 A 계정으로는 자신이 등록한 아이와 독서기록만 조회/수정되어야 합니다.
- 부모 B 계정으로 부모 A의 아이 데이터에 접근하면 빈 결과(RLS에 의해 차단)여야 합니다.
- 교사 계정으로 학급형 그룹을 만들고 부모 계정이 가입 승인을 받은 뒤, `teacher_reading_view`를 통해서만 최소한의 독서기록 컬럼이 보이는지 확인합니다.

## 폴더 구조

```text
/app            Next.js App Router 라우트 (탭, 인증, 온보딩 등)
/components     UI 프리미티브, 아이콘, 하단 탭 네비게이션
/lib/supabase   Supabase client/server 헬퍼
/supabase/migrations  DB 스키마 및 RLS 정책 마이그레이션
/legacy         서비스화 이전 개인용 프로토타입(참고용, 빌드 제외)
```

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버 실행
npm run lint    # ESLint
```
