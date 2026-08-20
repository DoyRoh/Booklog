import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import type { Database } from "@/lib/supabase/types";

// 국립어린이청소년도서관 "사서추천도서" Open API (한국문화정보원 KCISA meta2 게이트웨이).
// 응답 필드는 도서 전용 스키마가 아니라 범용 메타데이터 스키마라, 저자는
// creator, 추천사유/내용은 description에 뭉뚱그려 온다 -- ISBN·표지·출판사는
// 아예 없어서 카카오 검색으로 보강한다.
const NLCY_ENDPOINT = "https://api.kcisa.kr/openapi/service/rest/meta2/NLCFsase";
const NLCY_GROUP_NAME = "국립어린이청소년도서관";

type NlcyItem = {
  title?: unknown;
  creator?: unknown;
  description?: unknown;
  regDate?: unknown;
};

function findFirstValue(node: unknown, key: string): string | null {
  if (node == null || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  if (key in obj && typeof obj[key] !== "object") return String(obj[key]);
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        const found = findFirstValue(entry, key);
        if (found) return found;
      }
    } else if (typeof value === "object") {
      const found = findFirstValue(value, key);
      if (found) return found;
    }
  }
  return null;
}

// 응답 XML의 정확한 감싸는 구조(response>body>items>item 등)를 확인할 방법이
// 없어서, "title 필드를 가진 객체들의 배열"을 트리 어디서든 재귀적으로
// 찾는 방식으로 방어적으로 파싱한다.
function findItems(node: unknown): NlcyItem[] {
  if (node == null) return [];
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((entry) => entry && typeof entry === "object" && "title" in entry)) {
      return node as NlcyItem[];
    }
    return node.flatMap(findItems);
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if ("title" in obj && typeof obj.title !== "object") {
      return [obj as NlcyItem];
    }
    return Object.values(obj).flatMap(findItems);
  }
  return [];
}

async function fetchNlcyItems(serviceKey: string, numOfRows = 100): Promise<NlcyItem[]> {
  const url = new URL(NLCY_ENDPOINT);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("pageNo", "1");
  // 문서 안내: numOfRow/pageNo 외 다른 조회조건이 없어도 빈 값으로 포함해야 한다.
  url.searchParams.set("keyword", "");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`NLCY API 요청이 실패했어요 (HTTP ${res.status}).`);
  }
  const body = await res.text();

  // parseTagValue를 켜두면 resultCode="0000" 같은 앞자리 0이 있는 문자열이
  // 숫자 0으로 파싱돼 "0000"과 매치가 안 되는 문제가 있어(로컬 테스트로
  // 확인) 모든 태그 값을 문자열로 유지한다.
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false });
  const parsed: unknown = parser.parse(body);

  const resultCode = findFirstValue(parsed, "resultCode");
  if (resultCode && resultCode !== "0000") {
    const resultMsg = findFirstValue(parsed, "resultMsg") ?? "";
    throw new Error(`NLCY API 오류 (${resultCode}) ${resultMsg}`);
  }

  return findItems(parsed);
}

type KakaoMatch = {
  title: string;
  author: string | null;
  publisher: string | null;
  coverUrl: string | null;
  isbn: string | null;
};

async function enrichWithKakao(kakaoKey: string, title: string): Promise<KakaoMatch | null> {
  const url = new URL("https://dapi.kakao.com/v3/search/book");
  url.searchParams.set("query", title);
  url.searchParams.set("size", "5");

  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const docs: Array<{
    title?: string;
    authors?: string[];
    publisher?: string;
    thumbnail?: string;
    isbn?: string;
  }> = data.documents ?? [];
  if (docs.length === 0) return null;

  const normalizedTitle = title.replace(/\s/g, "");
  const best = docs.find((doc) => (doc.title ?? "").replace(/\s/g, "") === normalizedTitle) ?? docs[0];

  const isbns = (best.isbn ?? "").split(" ").filter(Boolean);
  const isbn13 = isbns.find((value) => value.length === 13) ?? isbns.at(-1) ?? null;

  return {
    title: best.title ?? title,
    author: Array.isArray(best.authors) && best.authors.length > 0 ? best.authors.join(", ") : null,
    publisher: best.publisher ?? null,
    coverUrl: best.thumbnail || null,
    isbn: isbn13,
  };
}

function normalizeKey(title: string, author: string) {
  return `${title.replace(/\s/g, "").toLowerCase()}::${author.replace(/\s/g, "").toLowerCase()}`;
}

export type NlcySyncResult = {
  fetched: number;
  added: number;
  skipped: number;
  errors: string[];
};

/**
 * NLCY 사서추천도서 API를 불러와 "국립어린이청소년도서관" 큐레이터 그룹의
 * 추천도서 목록에 반영한다. 이 큐레이터는 실제 로그인하는 사람이 없는
 * 서비스 계정이라, 미리 만들어둔 계정으로 서버에서 직접 로그인해 그
 * 계정 권한으로(=RLS 통과) 쓴다 -- 서비스 롤 키 없이도 안전하게 동작하는
 * 방식이다. NLCY_CURATOR_EMAIL/PASSWORD로 로그인할 계정은
 * supabase/seed/nlcy_curator.sql로 미리 세팅되어 있어야 한다.
 */
export async function syncNlcyRecommendations(): Promise<NlcySyncResult> {
  const nlcyKey = process.env.NLCY_SERVICE_KEY;
  const curatorEmail = process.env.NLCY_CURATOR_EMAIL;
  const curatorPassword = process.env.NLCY_CURATOR_PASSWORD;
  const kakaoKey = process.env.KAKAO_REST_API_KEY;

  if (!nlcyKey || !curatorEmail || !curatorPassword) {
    throw new Error(
      "NLCY_SERVICE_KEY / NLCY_CURATOR_EMAIL / NLCY_CURATOR_PASSWORD 환경변수가 필요해요."
    );
  }

  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: curatorEmail,
    password: curatorPassword,
  });
  if (signInError || !signInData.user) {
    throw new Error(`큐레이터 계정 로그인에 실패했어요: ${signInError?.message ?? "알 수 없는 오류"}`);
  }
  const curatorId = signInData.user.id;

  try {
    const { data: group } = await supabase
      .from("groups")
      .select("id, book_lists(id)")
      .eq("owner_id", curatorId)
      .eq("name", NLCY_GROUP_NAME)
      .maybeSingle();

    const bookListId = (group?.book_lists as { id: string }[] | null)?.[0]?.id;
    if (!group || !bookListId) {
      throw new Error(
        "큐레이터 그룹/추천도서 목록을 찾지 못했어요. supabase/seed/nlcy_curator.sql을 먼저 실행해 주세요."
      );
    }

    const items = await fetchNlcyItems(nlcyKey);

    const { data: existingItems } = await supabase
      .from("book_list_items")
      .select("books(title, author)")
      .eq("book_list_id", bookListId);
    const existingKeys = new Set(
      (existingItems ?? []).map((row) => {
        const book = row.books as unknown as { title: string; author: string | null } | null;
        return normalizeKey(book?.title ?? "", book?.author ?? "");
      })
    );

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) continue;
      const creator = typeof item.creator === "string" ? item.creator.trim() : "";
      const description = typeof item.description === "string" ? item.description.trim() : "";

      try {
        const enriched = kakaoKey ? await enrichWithKakao(kakaoKey, title) : null;
        const finalTitle = enriched?.title ?? title;
        const finalAuthor = enriched?.author ?? (creator || null);
        const key = normalizeKey(finalTitle, finalAuthor ?? "");

        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        let bookId: string | null = null;
        if (enriched?.isbn) {
          const { data: existingIsbn } = await supabase
            .from("book_isbns")
            .select("book_id")
            .eq("isbn", enriched.isbn)
            .maybeSingle();
          bookId = existingIsbn?.book_id ?? null;
        }

        if (!bookId) {
          bookId = crypto.randomUUID();
          const { error: bookError } = await supabase.from("books").insert({
            id: bookId,
            title: finalTitle,
            author: finalAuthor,
            publisher: enriched?.publisher ?? null,
            cover_url: enriched?.coverUrl ?? null,
            introduction: description || null,
            source: "nlcy",
          });
          if (bookError) throw bookError;

          if (enriched?.isbn) {
            await supabase.from("book_isbns").insert({ book_id: bookId, isbn: enriched.isbn });
          }
        }

        const { error: itemError } = await supabase
          .from("book_list_items")
          .upsert(
            { book_list_id: bookListId, book_id: bookId },
            { onConflict: "book_list_id,book_id", ignoreDuplicates: true }
          );
        if (itemError) throw itemError;

        existingKeys.add(key);
        added++;
      } catch (itemErr) {
        errors.push(`${title}: ${itemErr instanceof Error ? itemErr.message : String(itemErr)}`);
      }
    }

    return { fetched: items.length, added, skipped, errors };
  } finally {
    await supabase.auth.signOut();
  }
}
