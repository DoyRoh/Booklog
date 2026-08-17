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
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();
    const completed = profile?.onboarding_completed ?? false;

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
