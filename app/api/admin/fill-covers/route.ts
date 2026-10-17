import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { isAdminEmail } from "@/lib/admin";

// POST /api/admin/fill-covers -- 책숲 공식 숲지기 시드(supabase/seed/official_keepers.sql)가
// 제목·작가만으로 넣은 책(source='curated')에 카카오 책 검색으로 표지·출판사·ISBN을
// 채운다. books/book_isbns는 로그인한 사용자 누구나 쓰는 공유 카탈로그라 운영자의
// 세션으로 그대로 쓴다. 한 번에 BATCH권씩 -- 남은 게 있으면 다시 누르면 된다.
const BATCH = 40;
const CONCURRENCY = 5;

type KakaoDoc = { title?: string; authors?: string[]; publisher?: string; thumbnail?: string; isbn?: string };

const compact = (text: string) => text.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

// "맥 바넷 글 · 존 클라센 그림" → "맥 바넷". 시드의 작가 칸은 글·그림·옮김이 섞여 있어서
// 통째로 검색어에 넣으면 카카오가 아무것도 못 찾았다(칼데콧 시드 대부분이 표지 없이 남은 원인).
function firstAuthor(author: string | null) {
  if (!author) return "";
  const first = author.split(/[,·/]/)[0] ?? "";
  return first.replace(/\s*(글|그림|옮김|지음|엮음|글그림|글·그림)\s*$/u, "").trim();
}

// 이번 버전부터 예전 실패('curated-nomatch')도 한 번 더 시도하고, 그래도 못 찾으면
// 'curated-nomatch2'로 남겨 다시 안 돈다.
const PENDING = ["curated", "curated-nomatch"];

function pick(docs: KakaoDoc[], title: string, author: string | null) {
  const t = compact(title);
  const a = compact(firstAuthor(author));
  const scored = docs
    .filter((d) => d.thumbnail)
    .map((d) => {
      const dt = compact(d.title ?? "");
      const titleScore = dt === t ? 3 : dt.startsWith(t) ? 2 : dt.includes(t) ? 1 : 0;
      const authorHit = a && (d.authors ?? []).some((x) => compact(x).includes(a) || a.includes(compact(x)));
      // 세트·전집(총N권)은 낱권 표지가 아니라서 뒤로.
      const isSet = /세트|전\d+권|총\d+/.test(d.title ?? "");
      return { d, score: titleScore * 10 + (authorHit ? 5 : 0) - (isSet ? 4 : 0), titleScore, authorHit: !!authorHit };
    })
    // 제목이 정확히 같지 않으면 작가까지 맞아야 고른다(비슷한 제목의 다른 책 표지가 붙던 문제).
    .filter((x) => x.titleScore === 3 || (x.titleScore > 0 && x.authorHit))
    .sort((x, y) => y.score - x.score);
  return scored[0]?.d ?? null;
}

export async function POST() {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const supabase = await createClient();
  const { data: me } = await supabase.from("users").select("email").eq("id", userId).single();
  if (!isAdminEmail(me?.email)) return NextResponse.json({ error: "운영자만 쓸 수 있어요." }, { status: 403 });

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "KAKAO_REST_API_KEY가 설정되지 않았어요." }, { status: 500 });

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, publisher")
    .in("source", PENDING)
    .is("cover_url", null)
    .order("created_at")
    .limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let filled = 0;
  const missed: string[] = [];
  const queue = [...(books ?? [])];

  async function worker() {
    for (let book = queue.shift(); book; book = queue.shift()) {
      // 제목만(제목 대상 검색) → 제목+첫 작가 순으로, 고를 책이 나올 때까지.
      // 전집·시리즈(작가 "여러 작가")는 같은 제목의 낱권·다른 책 표지가 붙기 쉬워 자동으로 채우지 않는다
      // -- 책 상세의 "다른 책으로 바꾸기"/"표지 사진 올리기"로.
      if (/^여러\s*작가/.test(book.author ?? "")) {
        missed.push(book.title);
        await supabase.from("books").update({ source: "curated-nomatch2" }).eq("id", book.id);
        continue;
      }
      const author = firstAuthor(book.author);
      const attempts: [string, string | null][] = [[book.title, "title"], [author ? `${book.title} ${author}` : "", null]];
      let doc: KakaoDoc | null = null;
      for (const [query, target] of attempts) {
        if (!query) continue;
        const url = new URL("https://dapi.kakao.com/v3/search/book");
        url.searchParams.set("query", query);
        url.searchParams.set("size", "20");
        if (target) url.searchParams.set("target", target);
        const res = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
        const docs: KakaoDoc[] = res.ok ? ((await res.json()).documents ?? []) : [];
        doc = pick(docs, book.title, book.author);
        if (doc) break;
      }
      if (!doc) {
        missed.push(book.title);
        // 다음에 다시 안 시도하게 표시만 남긴다(표지 없이 'curated-nomatch').
        await supabase.from("books").update({ source: "curated-nomatch2" }).eq("id", book.id);
        continue;
      }
      await supabase
        .from("books")
        .update({ cover_url: doc.thumbnail, publisher: book.publisher ?? doc.publisher ?? null, source: "curated-kakao" })
        .eq("id", book.id);
      const isbn = (doc.isbn ?? "").split(" ").find((v) => v.length === 13);
      if (isbn) {
        // 이미 다른 책 행에 붙은 ISBN이면 유니크 제약으로 조용히 건너뛴다.
        await supabase.from("book_isbns").insert({ book_id: book.id, isbn });
      }
      filled += 1;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const { count: remaining } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .in("source", PENDING)
    .is("cover_url", null);

  return NextResponse.json({ filled, missed, remaining: remaining ?? 0 });
}
