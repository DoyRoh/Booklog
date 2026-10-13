import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import BorrowableList, { type WantBook } from "@/components/borrowable-list";

// 도서관 갈 때 보는 목록 — 책장의 "읽고 싶어요" 책 중 내 도서관에서 빌릴 수 있는 책.
export default async function BorrowablePage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();
  const activeChild = userId ? await getActiveChild(supabase, userId) : null;

  const { data, error } = activeChild
    ? await supabase
        .from("reading_records")
        .select("books(id, title, author, cover_url, book_isbns(isbn))")
        .eq("child_id", activeChild.id)
        .eq("status", "want")
        .order("created_at", { ascending: false })
    : { data: null, error: null };

  const seen = new Set<string>();
  const books: WantBook[] = [];
  for (const row of (data ?? []) as unknown as {
    books: { id: string; title: string; author: string | null; cover_url: string | null; book_isbns: { isbn: string }[] } | null;
  }[]) {
    const b = row.books;
    if (!b || seen.has(b.id)) continue;
    seen.add(b.id);
    const isbn = b.book_isbns.map((x) => x.isbn.replace(/[^0-9X]/gi, "")).find((v) => v.length === 13) ?? null;
    books.push({ id: b.id, title: b.title, author: b.author, coverUrl: b.cover_url, isbn });
  }

  return (
    <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px] pb-[16px]">
      <Link href="/library" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 책장
      </Link>
      <h1 className="d mt-2 text-xl">도서관 갈 때 보는 목록</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        책장의 <b>읽고 싶어요</b> 책 중에서 내 도서관에서 지금 빌릴 수 있는 책을 모았어요.
      </p>
      {!activeChild ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          위쪽 프로필에서 아이를 먼저 등록해 주세요.
        </p>
      ) : error ? (
        <p className="mt-6 text-sm" style={{ color: "var(--berry)" }}>
          불러오지 못했어요 ({error.message})
        </p>
      ) : (
        <BorrowableList books={books} />
      )}
    </div>
  );
}
