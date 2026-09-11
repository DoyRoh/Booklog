"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BookFinder from "@/components/book-finder";
import { ensureBook, type BookCandidate } from "@/lib/book-catalog";
import { BOOK_CATEGORIES } from "@/lib/categories";

export default function AddBookToList({ bookListIds }: { bookListIds: string[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // 후보를 고르면 바로 추가하지 않고, 분야를 정한 뒤 확정한다. "필독"
  // 표시는 없앴다 -- 꼭 읽혀야 하는 책은 추천도서가 아니라 숙제로 낸다.
  const [pending, setPending] = useState<BookCandidate | null>(null);
  const [pendingCategories, setPendingCategories] = useState<Set<string>>(new Set());

  function pickCandidate(candidate: BookCandidate) {
    setPending(candidate);
    setPendingCategories(new Set());
    setError(null);
  }

  function toggleCategory(category: string) {
    setPendingCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  async function confirmAdd() {
    if (!pending) return;
    setAdding(true);
    setError(null);

    const supabase = createClient();
    const ensured = await ensureBook(supabase, pending);
    if ("error" in ensured) {
      setError(ensured.error);
      setAdding(false);
      return;
    }
    const bookId = ensured.id;

    if (pendingCategories.size > 0) {
      await supabase
        .from("book_categories")
        .insert(Array.from(pendingCategories).map((category) => ({ book_id: bookId, category })));
    }

    // 여러 그룹을 동시에 골랐으면 그룹마다(=목록마다) 한 줄씩. 이미 있는
    // 목록엔 조용히 건너뛴다(마이그레이션 0014의 book_list_id+book_id 유니크
    // 제약을 그대로 이용 -- upsert 한 번으로 중복 걱정 없이 처리).
    const { error: itemError } = await supabase
      .from("book_list_items")
      .upsert(
        bookListIds.map((bookListId) => ({ book_list_id: bookListId, book_id: bookId, required: false })),
        { onConflict: "book_list_id,book_id", ignoreDuplicates: true }
      );
    if (itemError) {
      setError(itemError.message);
      setAdding(false);
      return;
    }

    setAdding(false);
    setPending(null);
    router.refresh();
  }

  if (pending) {
    return (
      <div
        className="rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <div className="flex items-center gap-3">
          {pending.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pending.coverUrl} alt="" className="h-16 w-11 flex-none rounded object-cover" />
          )}
          <div>
            <p className="d text-sm">{pending.title}</p>
            {pending.author && (
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {pending.author}
              </p>
            )}
          </div>
        </div>

        <p className="d mt-3 text-xs" style={{ color: "var(--ink-2)" }}>
          어느 분야인가요? (여러 개 선택 가능, 선택 안 해도 돼요)
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {BOOK_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className="d rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: pendingCategories.has(category) ? "var(--point)" : "var(--rule)",
                background: pendingCategories.has(category) ? "rgba(47,168,79,0.08)" : "transparent",
                color: pendingCategories.has(category) ? "var(--point-deep)" : "var(--ink-2)",
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-2 text-sm" style={{ color: "var(--berry)" }}>
            {error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setPending(null)}
            className="d flex-1 rounded-[14px] border py-2.5 text-sm"
            style={{ borderColor: "var(--rule)" }}
          >
            취소
          </button>
          <button
            type="button"
            disabled={adding}
            onClick={confirmAdd}
            className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            {adding ? "추가 중..." : "목록에 추가"}
          </button>
        </div>
      </div>
    );
  }

  return <BookFinder onPick={pickCandidate} />;
}
