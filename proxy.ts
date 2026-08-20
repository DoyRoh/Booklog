import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth session if expired, so Server Components can
  // read a valid session from cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const TAB_ROUTES = ["/today", "/library", "/records", "/recommend", "/more"];
  const PUBLIC_AUTH_PATHS = ["/login", "/signup"];
  const isTabRoute = TAB_ROUTES.some((p) => path === p || path.startsWith(`${p}/`));
  const isOnboarding = path === "/onboarding";
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user) {
    if (isTabRoute || isOnboarding) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (isTabRoute || isOnboarding || isPublicAuthPath) {
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
      if (completed) {
        response.cookies.set("chaeksup_onboarded", "1", {
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
      }
    }

    if (isPublicAuthPath) {
      return NextResponse.redirect(new URL(completed ? "/today" : "/onboarding", request.url));
    }
    if (isTabRoute && !completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    if (isOnboarding && completed) {
      return NextResponse.redirect(new URL("/today", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
