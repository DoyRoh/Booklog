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

  const headers = { Authorization: `KakaoAK ${apiKey}` };

  if (isbn) {
    const kakaoUrl = new URL("https://dapi.kakao.com/v3/search/book");
    kakaoUrl.searchParams.set("target", "isbn");
    kakaoUrl.searchParams.set("query", isbn);
    const kakaoRes = await fetch(kakaoUrl, { headers });
    if (!kakaoRes.ok) {
      return NextResponse.json({ error: "카카오 책 검색 요청이 실패했어요." }, { status: 502 });
    }
    const data = await kakaoRes.json();
    const docs: KakaoDoc[] = data.documents ?? [];
    if (!docs[0]) {
      return NextResponse.json({ error: "이 ISBN으로 책을 찾지 못했어요." }, { status: 404 });
    }
    return NextResponse.json(normalize(docs[0], isbn));
  }

  // 키워드 검색은 두 갈래를 동시에 부른다 -- 제목만 대상(target=title)과
  // 제목/저자/출판사 전체. 카카오는 "과학공룡"을 과학+공룡으로 나눠 관련
  // 책을 정확도순으로 주기 때문에, 제목에 그 말이 그대로 들어간 책
  // ("내친구 과학공룡")이 10건 안에 못 드는 일이 있었다. 결과는 합쳐서
  // (ISBN/제목으로 중복 제거) 검색어가 제목에 통째로 들어간 책을 맨 위로.
  const [titleRes, anyRes] = await Promise.all(
    [true, false].map((titleOnly) => {
      const kakaoUrl = new URL("https://dapi.kakao.com/v3/search/book");
      kakaoUrl.searchParams.set("query", query!);
      kakaoUrl.searchParams.set("size", "20");
      if (titleOnly) kakaoUrl.searchParams.set("target", "title");
      return fetch(kakaoUrl, { headers });
    })
  );
  if (!titleRes.ok && !anyRes.ok) {
    return NextResponse.json({ error: "카카오 책 검색 요청이 실패했어요." }, { status: 502 });
  }
  const docsOf = async (res: Response): Promise<KakaoDoc[]> =>
    res.ok ? ((await res.json()).documents ?? []) : [];
  const [titleDocs, anyDocs] = await Promise.all([docsOf(titleRes), docsOf(anyRes)]);

  const seen = new Set<string>();
  const merged = [...titleDocs, ...anyDocs].filter((doc) => {
    const key = (doc.isbn && doc.isbn.trim()) || `${doc.title}|${doc.publisher}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const compact = (text: string) => text.replace(/\s+/g, "").toLowerCase();
  const needle = compact(query!);
  const exact = merged.filter((doc) => compact(doc.title ?? "").includes(needle));
  const rest = merged.filter((doc) => !compact(doc.title ?? "").includes(needle));

  return NextResponse.json({ results: [...exact, ...rest].slice(0, 30).map((doc) => normalize(doc)) });
}
