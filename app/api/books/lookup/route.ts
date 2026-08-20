import { type NextRequest, NextResponse } from "next/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";

type KakaoDoc = {
  title?: string;
  authors?: string[];
  publisher?: string;
  thumbnail?: string;
  contents?: string;
  datetime?: string;
  isbn?: string;
};

function normalize(doc: KakaoDoc, fallbackIsbn?: string) {
  const isbns: string[] = (doc.isbn ?? "").split(" ").filter(Boolean);
  const isbn13 = isbns.find((value) => value.length === 13) ?? isbns.at(-1) ?? fallbackIsbn ?? "";

  return {
    title: doc.title ?? "",
    author: Array.isArray(doc.authors) ? doc.authors.join(", ") : "",
    publisher: doc.publisher ?? "",
    coverUrl: doc.thumbnail || null,
    introduction: doc.contents ?? "",
    publishDate: doc.datetime ? doc.datetime.slice(0, 10) : null,
    isbn: isbn13,
  };
}

// Server-only route: keeps KAKAO_REST_API_KEY out of the browser bundle.
// Client code calls GET /api/books/lookup?isbn=... (single result, exact
// ISBN match) or ?query=... (title/author keyword search, multiple
// candidates -- used when building a group's recommended-book list where
// there's no barcode to scan).
export async function GET(request: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY가 설정되지 않았어요." },
      { status: 500 }
    );
  }

  const isbn = request.nextUrl.searchParams.get("isbn")?.trim();
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!isbn && !query) {
    return NextResponse.json(
      { error: "isbn 또는 query 쿼리 파라미터가 필요해요." },
      { status: 400 }
    );
  }

  const kakaoUrl = new URL("https://dapi.kakao.com/v3/search/book");
  if (isbn) {
    kakaoUrl.searchParams.set("target", "isbn");
    kakaoUrl.searchParams.set("query", isbn);
  } else {
    // target 없이 query만 보내면 제목/저자/출판사 키워드 검색이 된다.
    kakaoUrl.searchParams.set("query", query!);
    kakaoUrl.searchParams.set("size", "10");
  }

  const kakaoRes = await fetch(kakaoUrl, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!kakaoRes.ok) {
    return NextResponse.json({ error: "카카오 책 검색 요청이 실패했어요." }, { status: 502 });
  }

  const data = await kakaoRes.json();
  const docs: KakaoDoc[] = data.documents ?? [];

  if (isbn) {
    if (!docs[0]) {
      return NextResponse.json({ error: "이 ISBN으로 책을 찾지 못했어요." }, { status: 404 });
    }
    return NextResponse.json(normalize(docs[0], isbn));
  }

  return NextResponse.json({ results: docs.map((doc) => normalize(doc)) });
}
