"use client";

import { useMemo, useState } from "react";
import Illustration, { PawStamp, type Avatar } from "@/components/illustration";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BOOK_CATEGORIES } from "@/lib/categories";
import type { RecommendBook } from "@/lib/recommend-books";

export type { RecommendBook };

type Filter = "all" | string;

// HABA 100처럼 "N/M권 · P%" 진행률 카드 + 분야별로 묶은 목록.
// 추천도서는 그룹의 "책 서랍"이라 강제 표시(필독)는 두지 않는다 -- 꼭 읽어야
// 할 책은 숙제로 낸다. 대신 책마다 두 가지 표시만 붙는다: 지금 진행 중인
// 숙제에 들어간 책은 등불("숙제 중"), 아이가 다 읽은 책은 발자국 도장.
export default function RecommendBookList({
  groupId,
  listName,
  books,
  activeChildId,
  childAvatar = null,
}: {
  groupId: string;
  listName: string;
  books: RecommendBook[];
  activeChildId: string | null;
  childAvatar?: Avatar | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [pinning, setPinning] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const book of books) for (const c of book.categories) set.add(c);
    // 표준 목록 순서를 먼저, 목록에 없는 분야(예전 이름·기관 데이터 등)는
    // 뒤에 가나다순으로 이어 붙인다 -- 예전엔 표준 목록에 없는 분야만 가진
    // 책이 화면에서 통째로 사라지는 버그가 있었다.
    const standard = BOOK_CATEGORIES.filter((c) => set.has(c));
    const extra = Array.from(set).filter((c) => !(BOOK_CATEGORIES as readonly string[]).includes(c)).sort();
    return [...standard, ...extra];
  }, [books]);

  const doneCount = books.filter((b) => b.readStatus === "done").length;
  const totalCount = books.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const filtered = useMemo(() => {
    if (filter === "all") return books;
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

  const lanternTotal = Math.min(totalCount, 10);
  const lanternLit = totalCount > 0 ? Math.round((doneCount / totalCount) * lanternTotal) : 0;

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
        {/* "함께 밝혀 나가는 숲길" -- 진행률만큼 등불이 켜진다. 등불 수는
            책 수(최대 10개)이고, 켜진 개수는 비율로 계산한다. */}
        {totalCount > 0 && (
          <>
            <div className="mt-3 flex flex-wrap gap-1" aria-label={`등불 ${lanternLit}개 켜짐`}>
              {Array.from({ length: lanternTotal }, (_, i) => (
                <Illustration
                  key={i}
                  name={i < lanternLit ? "lantern-on" : "lantern-off"}
                  height={30}
                  style={{ opacity: i < lanternLit ? 1 : 0.45 }}
                />
              ))}
            </div>
            {/* 책이 10권을 넘으면 등불 하나가 여러 권을 대표한다(100권짜리
                목록도 등불은 10개). 그걸 모르면 "왜 10개뿐이지" 싶어서 한 줄 안내. */}
            {totalCount > lanternTotal && (
              <p className="mt-1 text-[11px]" style={{ color: "var(--ink-2)" }}>
                등불 하나가 약 {Math.ceil(totalCount / lanternTotal)}권이에요
              </p>
            )}
          </>
        )}
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

      {/* 분야별로 따로 박스를 나누면 카드가 너무 많아 보인다는 피드백으로,
          전체 목록을 박스 하나에 담고 분야는 안의 소제목 행(구분선)으로만
          나눈다. */}
      {sections.length > 0 && (
        <div
          className="mt-4 overflow-hidden rounded-[var(--r)] border"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {sections.map(({ category, books: sectionBooks }, sectionIndex) => (
            <div key={category ?? "all"}>
              {category && (
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{
                    background: "var(--paper)",
                    borderTop: sectionIndex > 0 ? "1px solid var(--rule)" : undefined,
                  }}
                >
                  <span className="d text-sm">{category}</span>
                  <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {sectionBooks.filter((b) => b.readStatus === "done").length}/{sectionBooks.length}
                  </span>
                </div>
              )}
              {sectionBooks.map((book, index) => (
                <div
                  key={book.itemId + (category ?? "")}
                  className="flex items-center gap-3 p-3"
                  style={category || index > 0 ? { borderTop: "1px solid var(--rule)" } : undefined}
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
                      {book.inAssignment && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-2 text-[10px]"
                          style={{ background: "rgba(232,163,61,0.16)", color: "var(--lantern)" }}
                        >
                          <Illustration name="lantern-on" height={14} />
                          숙제 중
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
                    (book.readStatus === "done" ? (
                      <span
                        className="d flex flex-none items-center gap-1 text-xs"
                        style={{ color: "var(--point-deep)" }}
                        aria-label="읽었어요"
                      >
                        <PawStamp avatar={childAvatar} height={22} />
                        읽었어요
                      </span>
                    ) : book.readStatus === "reading" ? (
                      <span className="d flex-none text-xs" style={{ color: "var(--lantern)" }}>
                        읽는 중
                      </span>
                    ) : book.readStatus === "want" ? (
                      <span className="d flex-none text-xs" style={{ color: "var(--ink-2)" }}>
                        읽고 싶어요
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
          ))}
        </div>
      )}
    </div>
  );
}
