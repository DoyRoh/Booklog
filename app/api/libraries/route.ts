import { type NextRequest, NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { listLibraries } from "@/lib/library-api";
import { REGIONS } from "@/lib/library-regions";

// GET /api/libraries?region=11 → 그 시/도의 도서관 목록
export async function GET(request: NextRequest) {
  if (!(await getVerifiedUserId())) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const region = request.nextUrl.searchParams.get("region") ?? "";
  if (!REGIONS.some((r) => r.code === region)) {
    return NextResponse.json({ error: "지역을 골라 주세요." }, { status: 400 });
  }
  try {
    return NextResponse.json({ libraries: await listLibraries(region) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
