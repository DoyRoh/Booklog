import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { isAdminEmail } from "@/lib/admin";
import { NLCY_CATEGORIES, scrapeNlcyCategory, type NlcyCategoryKey } from "@/lib/nlcy-scrape";
import { importNlcyCategory } from "@/lib/nlcy-import";

export const maxDuration = 60;

// POST /api/admin/nlcy-import { category, dryRun }
// 운영 도구의 "미리보기"/"가져오기". 매달 자동 실행(/api/cron/nlcy-sync)과 같은
// importNlcyCategory를 쓰고, 목록에 넣는 건 운영자 세션 + 0036의 admin_add_list_items.
export async function POST(request: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const supabase = await createClient();
  const { data: me } = await supabase.from("users").select("email").eq("id", userId).single();
  if (!isAdminEmail(me?.email)) return NextResponse.json({ error: "운영자만 쓸 수 있어요." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { category?: string; dryRun?: boolean };
  const category = NLCY_CATEGORIES.find((c) => c.key === body.category);
  if (!category) return NextResponse.json({ error: "분류를 골라 주세요." }, { status: 400 });
  const key = category.key as NlcyCategoryKey;

  try {
    if (body.dryRun) {
      const scraped = await scrapeNlcyCategory(key);
      return NextResponse.json({ ...scraped, added: 0, dryRun: true });
    }
    const result = await importNlcyCategory(supabase, key, async (listId, bookIds) => {
      const { data, error } = await supabase.rpc("admin_add_list_items", { p_list: listId, p_books: bookIds });
      if (error) throw new Error(error.message);
      return data ?? 0;
    });
    return NextResponse.json({ ...result, dryRun: false });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
