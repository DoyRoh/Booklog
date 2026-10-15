// 사서추천도서 한 분류를 누리집 엑셀에서 읽어 "사서추천도서 · {분류}" 그룹에 넣는다(서버 전용).
// 운영 도구의 "가져오기"(운영자 세션)와 매달 자동 실행(국립어린이청소년도서관 숲지기 계정
// 세션)이 같은 코드를 쓴다 -- 목록에 넣는 방법만 addItems로 갈아 끼운다.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  NLCY_CATEGORIES,
  NLCY_OPERATOR_NAME,
  scrapeNlcyCategory,
  type NlcyBook,
  type NlcyCategoryKey,
  type NlcyScrapeResult,
} from "@/lib/nlcy-scrape";
import { nlcyTargetToBands, type AgeBand } from "@/lib/age-bands";

type KakaoDoc = { title?: string; authors?: string[]; publisher?: string; thumbnail?: string; isbn?: string; datetime?: string; contents?: string };
const compact = (t: string) => t.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

function pick(docs: KakaoDoc[], title: string, author: string | null) {
  const t = compact(title);
  const a = author ? compact(author) : "";
  return (
    docs
      .map((d) => {
        const dt = compact(d.title ?? "");
        const titleScore = dt === t ? 3 : dt.startsWith(t) || t.startsWith(dt) ? 2 : 0;
        const authorHit = a && (d.authors ?? []).some((x) => compact(x).includes(a) || a.includes(compact(x)));
        // 사서추천도서는 최근에 나온 책이 대부분이라 최근 출간을 앞으로.
        const recent = (d.datetime ?? "") >= "2024-06";
        const isSet = /세트|전\d+권|총\d+/.test(d.title ?? "");
        return { d, titleScore, score: titleScore * 10 + (authorHit ? 6 : 0) + (recent ? 3 : 0) + (d.thumbnail ? 1 : 0) - (isSet ? 5 : 0) };
      })
      .filter((x) => x.titleScore > 0)
      .sort((x, y) => y.score - x.score)[0]?.d ?? null
  );
}

// "글·그림: 김유진" / "장후이청 글 ;쉬쾅쾅 그림" → "김유진" / "장후이청"
function firstAuthor(author: string | null) {
  if (!author) return null;
  return (
    author
      .split(/[;,·]/)[0]
      .replace(/^(글·그림|글|그림|지은이|저자|글쓴이)\s*[:：]\s*/, "")
      .replace(/\s*(글·그림|글|그림|지음|옮김)$/, "")
      .trim() || null
  );
}

export type NlcyImportResult = NlcyScrapeResult & { added: number; missed: string[] };

/** 목록에 넣을 책 한 권과 그 추천 연령. */
export type NlcyListItem = { bookId: string; ageBands: AgeBand[] };

// 엑셀 "대상"이 비어 있을 때 분류로 정하는 연령(테마는 섞여 있어 비워 둠).
const CATEGORY_BANDS: Record<NlcyCategoryKey, AgeBand[]> = {
  infant: ["preschool"],
  lower: ["lower"],
  upper: ["upper"],
  teen: ["teen"],
  theme: [],
};

/** 한 분류를 읽어 카탈로그에 넣고 addItems(목록 id, 책+연령)로 그룹 목록에 넣는다. 넣은 수를 돌려준다. */
export async function importNlcyCategory(
  supabase: SupabaseClient<Database>,
  key: NlcyCategoryKey,
  addItems: (listId: string, items: NlcyListItem[]) => Promise<number>
): Promise<NlcyImportResult> {
  const category = NLCY_CATEGORIES.find((c) => c.key === key)!;
  const scraped = await scrapeNlcyCategory(key);
  if (scraped.books.length === 0) return { ...scraped, added: 0, missed: [] };

  const { data: group } = await supabase
    .from("groups")
    .select("id, book_lists(id)")
    .eq("operator_name", NLCY_OPERATOR_NAME)
    .eq("name", category.groupName)
    .eq("verified", true)
    .maybeSingle();
  const listId = (group?.book_lists as { id: string }[] | null)?.[0]?.id;
  if (!listId) {
    throw new Error(`"${category.groupName}" 그룹이 없어요. supabase/seed/nlcy_keeper.sql을 먼저 실행해 주세요.`);
  }

  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  const search = async (params: Record<string, string>) => {
    if (!kakaoKey) return [] as KakaoDoc[];
    const url = new URL("https://dapi.kakao.com/v3/search/book");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } });
    return res.ok ? (((await res.json()).documents ?? []) as KakaoDoc[]) : [];
  };

  const items = new Map<string, Set<AgeBand>>();
  const keep = (bookId: string, b: NlcyBook) => {
    const bands = nlcyTargetToBands(b.target);
    const set = items.get(bookId) ?? new Set<AgeBand>();
    for (const band of bands.length ? bands : CATEGORY_BANDS[key]) set.add(band);
    items.set(bookId, set);
  };
  const missed: string[] = [];
  const queue: NlcyBook[] = [...scraped.books];

  async function worker() {
    for (let b = queue.shift(); b; b = queue.shift()) {
      // 1) 이미 카탈로그에 있는 ISBN이면 카카오를 부르지 않고 그대로 쓴다(매달 다시 돌 때 대부분 여기서 끝).
      if (b.isbn) {
        const { data } = await supabase.from("book_isbns").select("book_id").eq("isbn", b.isbn).maybeSingle();
        if (data?.book_id) {
          keep(data.book_id, b);
          continue;
        }
      }
      // 2) 카카오에서 ISBN으로(정확), 없으면 제목+첫 저자로 표지·소개를 찾는다.
      let doc: KakaoDoc | null = null;
      if (b.isbn) doc = (await search({ query: b.isbn, target: "isbn" }))[0] ?? null;
      if (!doc) {
        const author = firstAuthor(b.author);
        doc = pick(await search({ query: [b.title.split(" : ")[0], author].filter(Boolean).join(" "), size: "15" }), b.title, author);
      }
      const isbn = b.isbn ?? (doc?.isbn ?? "").split(" ").find((v) => v.length === 13) ?? null;
      let bookId: string | null = null;
      if (isbn && isbn !== b.isbn) {
        const { data } = await supabase.from("book_isbns").select("book_id").eq("isbn", isbn).maybeSingle();
        bookId = data?.book_id ?? null;
      }
      if (!bookId) {
        // ISBN이 없는 책은 다시 돌려도 중복으로 안 생기게 같은 제목의 nlcy 책을 재사용.
        const { data } = await supabase
          .from("books")
          .select("id")
          .eq("title", doc?.title ?? b.title)
          .like("source", "nlcy%")
          .limit(1)
          .maybeSingle();
        bookId = data?.id ?? null;
      }
      if (!bookId) {
        bookId = crypto.randomUUID();
        const { error } = await supabase.from("books").insert({
          id: bookId,
          title: doc?.title ?? b.title,
          author: doc?.authors?.length ? doc.authors.join(", ") : b.author,
          publisher: doc?.publisher || b.publisher,
          cover_url: doc?.thumbnail || null,
          introduction: doc?.contents || null,
          source: "nlcy",
        });
        if (error) {
          missed.push(`${b.title} (${error.message})`);
          continue;
        }
        if (isbn) await supabase.from("book_isbns").insert({ book_id: bookId, isbn });
      }
      if (!doc) missed.push(b.title);
      keep(bookId, b);
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));

  const added = await addItems(
    listId,
    [...items].map(([bookId, bands]) => ({ bookId, ageBands: [...bands] }))
  );
  return { ...scraped, added, missed };
}
