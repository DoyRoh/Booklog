// 상단바(TopBar)·하단탭(BottomNav)을 숨겨야 하는 경로 -- 로그인 전후의
// 인증 흐름과 약관 페이지는 앱 크롬 없이 단독 화면으로 보여준다. 두
// 컴포넌트가 각자 목록을 들고 있다가 서로 어긋났던 적이 있어 한 곳에 둔다.
export const AUTH_HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
];

export function isChromeHidden(pathname: string) {
  return AUTH_HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
