import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Server-only route: keeps KAKAO_REST_API_KEY out of the browser bundle.
// Client code calls GET /api/books/lookup?isbn=... instead of hitting
// Kakao directly.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const isbn = request.nextUrl.searchParams.get("isbn")?.trim();
  if (!isbn) {
    return NextResponse.json({ error: "isbn 쿼리 파라미터가 필요해요." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY가 설정되지 않았어요." },
      { status: 500 }
    );
  }

  const kakaoUrl = new URL("https://dapi.kakao.com/v3/search/book");
  kakaoUrl.searchParams.set("target", "isbn");
  kakaoUrl.searchParams.set("query", isbn);

  const kakaoRes = await fetch(kakaoUrl, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!kakaoRes.ok) {
    return NextResponse.json({ error: "카카오 책 검색 요청이 실패했어요." }, { status: 502 });
  }

  const data = await kakaoRes.json();
  const doc = data.documents?.[0];
  if (!doc) {
    return NextResponse.json({ error: "이 ISBN으로 책을 찾지 못했어요." }, { status: 404 });
  }

  const isbns: string[] = (doc.isbn ?? "").split(" ").filter(Boolean);
  const isbn13 = isbns.find((value) => value.length === 13) ?? isbns.at(-1) ?? isbn;

  return NextResponse.json({
    title: doc.title ?? "",
    author: Array.isArray(doc.authors) ? doc.authors.join(", ") : "",
    publisher: doc.publisher ?? "",
    coverUrl: doc.thumbnail || null,
    introduction: doc.contents ?? "",
    publishDate: doc.datetime ? doc.datetime.slice(0, 10) : null,
    isbn: isbn13,
  });
}
