import { type NextRequest, NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { bookExist, librariesHolding } from "@/lib/library-api";
import { REGIONS } from "@/lib/library-regions";

// 대출 가능 여부까지 확인하는 도서관 수(정보나루 하루 호출 한도 때문에 제한).
const CHECK_LIMIT = 10;

// GET /api/libraries/holding?isbn=978...&region=11 → 그 지역에서 이 책을 가진 도서관 + 대출 가능 여부
export async function GET(request: NextRequest) {
  if (!(await getVerifiedUserId())) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const isbn = (request.nextUrl.searchParams.get("isbn") ?? "").replace(/[^0-9X]/gi, "");
  const region = request.nextUrl.searchParams.get("region") ?? "";
  if (isbn.length !== 13 || !REGIONS.some((r) => r.code === region)) {
    return NextResponse.json({ error: "ISBN(13자리)과 지역이 필요해요." }, { status: 400 });
  }
  try {
    const libs = await librariesHolding(isbn, region);
    const checked = await Promise.all(libs.slice(0, CHECK_LIMIT).map((lib) => bookExist(lib.code, isbn)));
    const libraries = libs.map((lib, i) => {
      const r = checked[i];
      return { ...lib, loanAvailable: r && !("error" in r) ? r.loanAvailable : null };
    });
    // 빌릴 수 있는 곳 → 대출 중 → 확인 안 한 곳
    const rank = (v: boolean | null) => (v === true ? 0 : v === false ? 1 : 2);
    libraries.sort((a, b) => rank(a.loanAvailable) - rank(b.loanAvailable));
    return NextResponse.json({ libraries, total: libs.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
