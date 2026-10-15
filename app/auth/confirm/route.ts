import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// 메일 링크(비밀번호 재설정, 가입 확인)가 최종적으로 도착하는 곳. Supabase가 발급한
// code를 실제 로그인 세션으로 교환한 뒤(exchangeCodeForSession) next로 넘긴다
// (기본값 /reset-password, 가입 확인은 /onboarding).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // token_hash 방식(메일 템플릿이 {{ .TokenHash }}로 링크를 만들 때): 요청한 기기와
  // 다른 브라우저에서 열어도 된다. 앱에서 비밀번호 재설정을 요청하고 Gmail → 사파리로
  // 링크를 열면 아래 code 방식은 교환값이 앱에만 있어 실패하므로 이쪽을 쓴다.
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // 가입 확인 메일은 앱에서 가입하고 링크는 Gmail → 사파리에서 여는 경우가 흔하다.
    // 그러면 code 교환에 필요한 값이 가입한 쪽(앱)에만 있어 교환은 실패하지만,
    // 이메일 확인 자체는 Supabase가 이 주소로 보내기 전에 이미 끝냈다.
    if (next === "/onboarding") {
      return NextResponse.redirect(`${origin}/login?confirmed=1`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("인증 링크가 만료됐거나 올바르지 않아요. 다시 시도해 주세요.")}`
  );
}
