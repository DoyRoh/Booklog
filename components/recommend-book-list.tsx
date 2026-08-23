"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BOOK_CATEGORIES } from "@/lib/categories";
import type { RecommendBook } from "@/lib/recommend-books";

export type { RecommendBook };

type Filter = "all" | "required" | string;

// HABA 100처럼 "N/M권 · P%" 진행률 카드 + 분야별로 묶은 목록.
export default function RecommendBookList({
  groupId,
  listName,
  books,
  activeChildId,
}: {
  groupId: string;
  listName: string;
  books: RecommendBook[];
  activeChildId: string | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [pinning, setPinning] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const book of books) for (const c of book.categories) set.add(c);
    return BOOK_CATEGORIES.filter((c) => set.has(c));
  }, [books]);

  const requiredCount = books.filter((b) => b.required).length;
  const doneCount = books.filter((b) => b.inShelf).length;
  const totalCount = books.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const filtered = useMemo(() => {
    if (filter === "all") return books;
    if (filter === "required") return books.filter((b) => b.required);
    return books.filter((b) => b.categories.includes(filter));
  }, [books, filter]);

  const sections = useMemo(() => {
    if (filter !== "all") return [{ category: null, books: filtered }];
    const uncategorized: RecommendBook[] = [];
    const byCategory = new Map<string, RecommendBook[]>();
    for (const book of filtered) {
      if (book.categories.length === 0) {
        uncategorized.push(book);
        continue;
      }
      for (const c of book.categories) {
        const list = byCategory.get(c) ?? [];
        list.push(book);
        byCategory.set(c, list);
      }
    }
    const result: { category: string; books: RecommendBook[] }[] = availableCategories
      .filter((c) => byCategory.has(c))
      .map((c) => ({ category: c, books: byCategory.get(c)! }));
    if (uncategorized.length > 0) result.push({ category: "분야 미지정", books: uncategorized });
    return result;
  }, [filtered, filter, availableCategories]);

  async function pinToShelf(book: RecommendBook) {
    if (!activeChildId || pinning) return;
    setPinning(book.bookId);
    const supabase = createClient();
    await supabase.from("reading_records").insert({
      child_id: activeChildId,
      book_id: book.bookId,
      group_id: groupId,
      status: "want",
    });
    setPinning(null);
    router.refresh();
  }

  return (
    <div>
      <div
        className="rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <p className="text-xs" style={{ color: "var(--ink-2)" }}>
          {listName}
        </p>
        <p className="d mt-1 text-2xl">
          {doneCount} <span className="text-base font-normal">/ {totalCount}권 · {percent}%</span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--paper)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${percent}%`, background: "var(--point)" }}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className="d flex-none rounded-full border px-3 py-1 text-xs"
          style={{
            borderColor: filter === "all" ? "var(--point)" : "var(--rule)",
            background: filter === "all" ? "rgba(47,168,79,0.08)" : "var(--card)",
            color: filter === "all" ? "var(--point-deep)" : "var(--ink-2)",
          }}
        >
          전체 {totalCount}
        </button>
        {requiredCount > 0 && (
          <button
            type="button"
            onClick={() => setFilter("required")}
            className="d flex-none rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: filter === "required" ? "var(--point)" : "var(--rule)",
              background: filter === "required" ? "rgba(47,168,79,0.08)" : "var(--card)",
              color: filter === "required" ? "var(--point-deep)" : "var(--ink-2)",
            }}
          >
            필독 {requiredCount}
          </button>
        )}
        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className="d flex-none rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: filter === category ? "var(--point)" : "var(--rule)",
              background: filter === category ? "rgba(47,168,79,0.08)" : "var(--card)",
              color: filter === category ? "var(--point-deep)" : "var(--ink-2)",
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {sections.length === 0 && (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 추천도서가 없어요.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-5">
        {sections.map(({ category, books: sectionBooks }) => (
          <div key={category ?? "all"}>
            {category && (
              <div className="flex items-center justify-between px-1">
                <span className="d text-sm">{category}</span>
                <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {sectionBooks.filter((b) => b.inShelf).length}/{sectionBooks.length}
                </span>
              </div>
            )}
            <div
              className="mt-2 overflow-hidden rounded-[var(--r)] border"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              {sectionBooks.map((book, index) => (
                <div
                  key={book.itemId + (category ?? "")}
                  className="flex items-center gap-3 p-3"
                  style={index > 0 ? { borderTop: "1px solid var(--rule)" } : undefined}
                >
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="h-14 w-10 flex-none rounded object-cover"
                    />
                  ) : (
                    <div
                      className="h-14 w-10 flex-none rounded"
                      style={{ background: "var(--paper)" }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{book.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {book.required && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{ background: "rgba(232,163,61,0.16)", color: "var(--lantern)" }}
                        >
                          필독
                        </span>
                      )}
                      {book.author && (
                        <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                          {book.author}
                        </span>
                      )}
                    </div>
                  </div>
                  {activeChildId &&
                    (book.inShelf ? (
                      <span className="d flex-none text-xs" style={{ color: "var(--point-deep)" }}>
                        책장에 있어요
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={pinning === book.bookId}
                        onClick={() => pinToShelf(book)}
                        className="d flex-none rounded-full border px-3 py-1.5 text-xs disabled:opacity-40"
                        style={{ borderColor: "var(--point)", color: "var(--point-deep)" }}
                      >
                        {pinning === book.bookId ? "꽂는 중" : "책장에 꽂기"}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
