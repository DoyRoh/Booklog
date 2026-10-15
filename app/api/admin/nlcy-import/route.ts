import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { isAdminEmail } from "@/lib/admin";
import { NLCY_CATEGORIES, NLCY_OPERATOR_NAME, scrapeNlcyCategory, type NlcyCategoryKey } from "@/lib/nlcy-scrape";

export const maxDuration = 60;

// POST /api/admin/nlcy-import { category, dryRun }
// 국립어린이청소년도서관 사서추천도서(2025·2026)를 분류 하나씩 읽어
// "사서추천도서 · {분류}" 그룹(supabase/seed/nlcy_keeper.sql)에 넣는다.
// dryRun이면 읽기만 하고 아무것도 쓰지 않는다(무엇을 찾았는지 확인용).
// 책 카탈로그는 운영자 세션으로 쓰고, 목록 넣기는 0036의 admin_add_list_items.

type KakaoDoc = { title?: string; authors?: string[]; publisher?: string; thumbnail?: string; isbn?: string; datetime?: string; contents?: string };
const compact = (t: string) => t.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

function pick(docs: KakaoDoc[], title: string, author: string | null) {
  const t = compact(title);
  const a = author ? compact(author.split(/[,·]/)[0]) : "";
  return (
    docs
      .map((d) => {
        const dt = compact(d.title ?? "");
        const titleScore = dt === t ? 3 : dt.startsWith(t) || t.startsWith(dt) ? 2 : 0;
        const authorHit = a && (d.authors ?? []).some((x) => compact(x).includes(a) || a.includes(compact(x)));
        // 사서추천도서는 최근 6개월 안에 나온 책이라 2024년 이후 출간을 앞으로.
        const recent = (d.datetime ?? "") >= "2024-06";
        const isSet = /세트|전\d+권|총\d+/.test(d.title ?? "");
        return { d, titleScore, score: titleScore * 10 + (authorHit ? 6 : 0) + (recent ? 3 : 0) + (d.thumbnail ? 1 : 0) - (isSet ? 5 : 0) };
      })
      .filter((x) => x.titleScore > 0)
      .sort((x, y) => y.score - x.score)[0]?.d ?? null
  );
}

export async function POST(request: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const supabase = await createClient();
  const { data: me } = await supabase.from("users").select("email").eq("id", userId).single();
  if (!isAdminEmail(me?.email)) return NextResponse.json({ error: "운영자만 쓸 수 있어요." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { category?: string; dryRun?: boolean };
  const category = NLCY_CATEGORIES.find((c) => c.key === body.category);
  if (!category) return NextResponse.json({ error: "분류를 골라 주세요." }, { status: 400 });

  let scraped;
  try {
    scraped = await scrapeNlcyCategory(category.key as NlcyCategoryKey);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  if (body.dryRun || scraped.books.length === 0) {
    return NextResponse.json({ ...scraped, added: 0, dryRun: Boolean(body.dryRun) });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, book_lists(id)")
    .eq("operator_name", NLCY_OPERATOR_NAME)
    .eq("name", category.groupName)
    .eq("verified", true)
    .maybeSingle();
  const listId = (group?.book_lists as { id: string }[] | null)?.[0]?.id;
  if (!listId) {
    return NextResponse.json(
      { error: `"${category.groupName}" 그룹이 없어요. supabase/seed/nlcy_keeper.sql을 먼저 실행해 주세요.` },
      { status: 400 }
    );
  }

  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  const bookIds: string[] = [];
  const missed: string[] = [];
  const queue = [...scraped.books];
  async function worker() {
    for (let b = queue.shift(); b; b = queue.shift()) {
      let doc: KakaoDoc | null = null;
      if (kakaoKey) {
        // 엑셀에 ISBN이 있으니 ISBN으로 먼저 찾고(정확), 없으면 제목·저자로.
        const search = async (params: Record<string, string>) => {
          const url = new URL("https://dapi.kakao.com/v3/search/book");
          for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
          const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } });
          return res.ok ? (((await res.json()).documents ?? []) as KakaoDoc[]) : [];
        };
        if (b.isbn) doc = (await search({ query: b.isbn, target: "isbn" }))[0] ?? null;
        if (!doc) {
          const firstAuthor = b.author?.split(/[;,·]/)[0].replace(/^(글|그림|지은이)\s*[:：]\s*/, "").replace(/\s*(글·그림|글|그림|지음|옮김)$/, "").trim();
          doc = pick(await search({ query: [b.title.split(" : ")[0], firstAuthor].filter(Boolean).join(" "), size: "15" }), b.title, firstAuthor ?? null);
        }
      }
      const isbn = b.isbn ?? (doc?.isbn ?? "").split(" ").find((v) => v.length === 13) ?? null;
      let bookId: string | null = null;
      if (isbn) {
        const { data } = await supabase.from("book_isbns").select("book_id").eq("isbn", isbn).maybeSingle();
        bookId = data?.book_id ?? null;
      }
      if (!bookId) {
        // ISBN을 못 찾은 책은 다시 눌러도 중복으로 안 생기게 같은 제목의 nlcy 책을 재사용.
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
      bookIds.push(bookId);
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));

  const { data: added, error } = await supabase.rpc("admin_add_list_items", { p_list: listId, p_books: bookIds });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...scraped, added: added ?? 0, missed, dryRun: false });
}
