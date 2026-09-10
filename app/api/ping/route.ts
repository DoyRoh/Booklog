import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 속도 진단용: /api/ping 을 폰에서 열면 이 서버 함수가 어느 리전에서 돌고,
// 인증 확인과 DB 왕복 한 번에 각각 몇 ms 걸리는지 글자로 보여준다.
// "어디가 느린지"를 추측 대신 숫자로 보기 위한 것이라 화면 링크는 없다.
let invocations = 0;
const bootedAt = Date.now();

export async function GET() {
  invocations += 1;
  const t0 = Date.now();
  const supabase = await createClient();

  const tAuth = Date.now();
  const { data: claims } = await supabase.auth.getClaims();
  const authMs = Date.now() - tAuth;

  const tDb = Date.now();
  const { error } = await supabase.from("book_questions").select("id").limit(1);
  const dbMs = Date.now() - tDb;

  const lines = [
    `Vercel 리전: ${process.env.VERCEL_REGION ?? "(로컬)"}`,
    `Supabase 호스트: ${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https?:\/\//, "")}`,
    `이 서버 인스턴스: ${invocations === 1 ? "방금 새로 켜짐(콜드 스타트)" : `${invocations}번째 요청(따뜻함)`} · 켜진 지 ${Math.round((Date.now() - bootedAt) / 1000)}초`,
    `로그인 상태: ${claims?.claims?.sub ? "로그인됨" : "비로그인"}`,
    `인증 확인: ${authMs}ms`,
    `DB 왕복 1회: ${dbMs}ms${error ? ` (오류: ${error.message})` : ""}`,
    `합계: ${Date.now() - t0}ms`,
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
