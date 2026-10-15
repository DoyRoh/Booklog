import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { NLCY_CATEGORIES, type NlcyCategoryKey } from "@/lib/nlcy-scrape";
import { importNlcyCategory } from "@/lib/nlcy-import";
import { ADMIN_EMAILS } from "@/lib/admin";

export const maxDuration = 60;

// 매달 3일 새벽(KST) Vercel Cron이 부르는 경로(vercel.json). 사서추천도서는 짝수 달 초에
// 올라오는데, 이미 있는 책은 건너뛰므로 매달 돌려도 중복이 생기지 않고 늦게 올라와도 놓치지 않는다.
//
// 권한: 로그인한 사람이 없으니 국립어린이청소년도서관 숲지기 계정(supabase/seed/nlcy_keeper.sql)으로
// 직접 로그인해서, 그 계정이 운영하는 다섯 그룹에 RLS("operators manage book_list_items") 그대로 넣는다.
// 서비스 롤 키는 쓰지 않는다.
//
// Vercel 환경변수
//   CRON_SECRET            아무 긴 문자열. Vercel이 Cron 요청에 Bearer로 실어 보낸다(없으면 실행 안 함).
//   NLCY_CURATOR_PASSWORD  byul890808+nlcy@gmail.com 계정의 비밀번호.
//   NLCY_CURATOR_EMAIL     (선택) 계정 이메일을 바꿀 때만.
//   RESEND_API_KEY         (선택) 있으면 결과를 운영자 메일로 보낸다(새 책이 들어왔거나 실패했을 때만).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = process.env.NLCY_CURATOR_EMAIL || "byul890808+nlcy@gmail.com";
  const password = process.env.NLCY_CURATOR_PASSWORD;
  const lines: string[] = [];
  let totalAdded = 0;
  let failed = false;

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!password) {
    failed = true;
    lines.push("NLCY_CURATOR_PASSWORD 환경변수가 없어요. Vercel → Settings → Environment Variables에 넣어 주세요.");
  } else {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      failed = true;
      lines.push(`${email} 로그인에 실패했어요: ${signInError.message}`);
    } else {
      // 한 분류씩 차례로(누리집에 한꺼번에 몰리지 않게). 한 분류가 실패해도 나머지는 계속.
      for (const c of NLCY_CATEGORIES) {
        try {
          const r = await importNlcyCategory(supabase, c.key as NlcyCategoryKey, async (listId, items) => {
            if (items.length === 0) return 0;
            const { data, error } = await supabase
              .from("book_list_items")
              .upsert(
                items.map((i) => ({ book_list_id: listId, book_id: i.bookId, age_bands: i.ageBands.length ? i.ageBands : null })),
                { onConflict: "book_list_id,book_id", ignoreDuplicates: true }
              )
              .select("id");
            if (error) throw new Error(error.message);
            // 이미 있던 책은 연령이 비어 있을 때만 채운다(숲지기가 고친 값은 덮어쓰지 않음).
            const byBands = new Map<string, string[]>();
            for (const i of items) {
              if (i.ageBands.length === 0) continue;
              const k = i.ageBands.join(",");
              byBands.set(k, [...(byBands.get(k) ?? []), i.bookId]);
            }
            for (const [k, ids] of byBands) {
              await supabase
                .from("book_list_items")
                .update({ age_bands: k.split(",") })
                .eq("book_list_id", listId)
                .in("book_id", ids)
                .is("age_bands", null);
            }
            return data?.length ?? 0;
          });
          totalAdded += r.added;
          lines.push(`${c.tab}: 목록 ${r.books.length}권 · 새로 ${r.added}권${r.missed.length ? ` · 표지 못 찾음 ${r.missed.length}권` : ""}`);
        } catch (e) {
          failed = true;
          lines.push(`${c.tab}: 실패 — ${(e as Error).message}`);
        }
      }
      await supabase.auth.signOut();
    }
  }

  // 새 책이 들어왔거나 실패했을 때만 메일(아무 일 없는 달은 조용히).
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && (failed || totalAdded > 0)) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "책숲 <onboarding@resend.dev>",
        to: ADMIN_EMAILS[0],
        subject: failed ? "[책숲] 사서추천도서 자동 가져오기 — 확인 필요" : `[책숲] 사서추천도서 새로 ${totalAdded}권 들어왔어요`,
        text: [...lines, "", "직접 다시 하려면: 앱 → 프로필·설정 → 운영 도구 → 사서추천도서"].join("\n"),
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: !failed, totalAdded, lines }, { status: failed ? 500 : 200 });
}
