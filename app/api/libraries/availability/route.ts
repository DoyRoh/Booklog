import { type NextRequest, NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { bookExist } from "@/lib/library-api";

// GET /api/libraries/availability?isbn=978...&libs=111001,111002 (최대 3곳)
export async function GET(request: NextRequest) {
  if (!(await getVerifiedUserId())) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const isbn = (request.nextUrl.searchParams.get("isbn") ?? "").replace(/[^0-9X]/gi, "");
  const libs = (request.nextUrl.searchParams.get("libs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .slice(0, 3);
  if (isbn.length !== 13 || libs.length === 0) {
    return NextResponse.json({ error: "ISBN(13자리)과 도서관이 필요해요." }, { status: 400 });
  }
  if (!process.env.LIBRARY_API_KEY) {
    return NextResponse.json({ error: "LIBRARY_API_KEY가 설정되지 않았어요." }, { status: 500 });
  }
  const results = await Promise.all(libs.map((code) => bookExist(code, isbn)));
  return NextResponse.json({ results });
}
