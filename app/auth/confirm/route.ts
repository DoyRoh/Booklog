import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 비밀번호 재설정 메일의 링크가 최종적으로 도착하는 곳. Supabase가 발급한
// code를 실제 로그인 세션으로 교환한 뒤(exchangeCodeForSession), 새
// 비밀번호를 입력할 화면(기본값 /reset-password)으로 넘긴다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("인증 링크가 만료됐거나 올바르지 않아요. 다시 시도해 주세요.")}`
  );
}
