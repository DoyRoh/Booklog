import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { VERIFIED_USER_HEADER } from "@/lib/supabase/verified-user";
import { fetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";

export async function proxy(request: NextRequest) {
  let cookiesToApply: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 인증 서버·DB가 멈춰도 미들웨어가 모든 요청을 붙들고 있지 않도록.
      global: { fetch: fetchWithTimeout(8_000) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToApply = cookiesToSet;
        },
      },
    }
  );

  // 세션이 만료됐으면 여기서 갱신되고, 서버 컴포넌트는 쿠키의 유효한
  // 세션을 읽는다. getUser()는 요청마다 Auth 서버에 왕복하지만, getClaims()는
  // 프로젝트의 서명 키(JWKS, 한 번 받아 캐시)로 토큰을 **로컬에서** 검증해
  // 화면 전환마다 붙던 왕복 하나를 없앤다(비대칭 키가 아닌 프로젝트면
  // 내부적으로 서버 검증으로 대체되므로 지금보다 나빠지진 않는다).
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null;

  // 이 요청이 검증한 사용자 id를 헤더로 실어 페이지들에게 넘긴다(자세한
  // 이유는 lib/supabase/verified-user.ts 참고) -- 클라이언트가 보낸 같은
  // 이름의 헤더는 항상 지우고 다시 채우므로 위조될 수 없다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VERIFIED_USER_HEADER);
  if (user) {
    requestHeaders.set(VERIFIED_USER_HEADER, user.id);
  }

  const path = request.nextUrl.pathname;
  // 로그인이 필요한 화면 전부 -- 탭 경로뿐 아니라 배지/숲길/대시보드처럼
  // 탭 밖에서 들어가는 화면도 포함한다(빠져 있으면 로그아웃 상태에서
  // "로그인하기" 링크만 덜렁 뜨는 반쪽 화면이 보인다).
  const TAB_ROUTES = [
    "/today",
    "/library",
    "/records",
    "/recommend",
    "/more",
    "/group",
    "/assignments",
    "/badges",
    "/forest",
    "/trail",
    "/search",
    "/teacher",
    "/curator",
  ];
  const PUBLIC_AUTH_PATHS = ["/login", "/signup"];
  const isTabRoute = TAB_ROUTES.some((p) => path === p || path.startsWith(`${p}/`));
  const isOnboarding = path === "/onboarding";
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  let redirectTo: string | null = null;
  let markOnboarded = false;

  if (!user) {
    if (isTabRoute || isOnboarding) {
      redirectTo = "/login";
    }
  } else if (isTabRoute || isOnboarding || isPublicAuthPath) {
    // 온보딩 완료 여부는 한 번 확인하면 사실상 다시 안 바뀌는데, 탭을
    // 옮길 때마다 매번 DB에 다시 물어보고 있었다(모든 화면 전환의 지연에
    // 한 번씩 보태는 셈). 쿠키에 캐싱해서, 이미 온보딩을 마친 사용자는
    // 탭 이동 시 이 조회를 완전히 건너뛴다.
    const cachedCompleted = request.cookies.get("chaeksup_onboarded")?.value === "1";
    let completed = cachedCompleted;
    if (!cachedCompleted) {
      const { data: profile } = await supabase
        .from("users")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      completed = profile?.onboarding_completed ?? false;
      markOnboarded = completed;
    }

    if (isPublicAuthPath) {
      redirectTo = completed ? "/today" : "/onboarding";
    } else if (isTabRoute && !completed) {
      redirectTo = "/onboarding";
    } else if (isOnboarding && completed) {
      redirectTo = "/today";
    }
  }

  // 리다이렉트든 통과든 한 곳에서만 최종 응답을 만든다 -- 예전 코드는
  // 리다이렉트 분기마다 따로 return해서, 세션 갱신으로 새로 발급된 쿠키가
  // 리다이렉트 응답에는 안 실리는 경우가 있었다(로그인 직후 리다이렉트에서
  // 갱신된 세션 쿠키가 누락될 뻔한 지점).
  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request: { headers: requestHeaders } });

  cookiesToApply.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  if (markOnboarded) {
    response.cookies.set("chaeksup_onboarded", "1", { maxAge: 60 * 60 * 24 * 365, path: "/" });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
