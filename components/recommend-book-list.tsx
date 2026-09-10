"use client";

import { useMemo, useState } from "react";
import { ReadCheck, ShelfBookmark } from "@/components/read-toggles";
import { BOOK_CATEGORIES, categoryColor } from "@/lib/categories";
import { LogRow, monthOf, shortMd } from "@/components/log-row";
import Section from "@/components/section";
import type { RecommendBook } from "@/lib/recommend-books";

export type { RecommendBook };

type Filter = "all" | string;

// 숲지기가 보는 "올린 추천도서" 목록 = 카드 하나. 제목·분야 칩이 카드 머리에
// 있고, 그 아래 올린 달별로 소제목 띠 + 날짜·분야 칩·제목 줄이 이어진다.
// (예전엔 제목과 칩이 배경에 떠 있고 달마다 따로 카드라 "제목 따로 놀음".)
// 아이·부모가 보는 둘러보기는 recommend-shelf.tsx(표지 선반).
export default function RecommendBookList({
  groupId,
  books,
  activeChildId,
  manage = false,
  title,
}: {
  groupId: string;
  listName?: string;
  books: RecommendBook[];
  activeChildId: string | null;
  /** 숲지기 관리 화면: 기록 링크·책갈피/체크 없이 목록만. */
  manage?: boolean;
  title?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");

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

  const totalCount = books.length;

  const filtered = useMemo(() => {
    if (filter === "all") return books;
    return books.filter((b) => b.categories.includes(filter));
  }, [books, filter]);

  // 올린 달별로 묶는다(최신 달이 위, 달 안에서도 최신이 위 -- 조회가 이미
  // created_at desc라 순서만 유지하면 된다).
  const monthGroups = useMemo(() => {
    const groups: { key: string; label: string; books: RecommendBook[] }[] = [];
    for (const book of filtered) {
      const { key, label } = monthOf(book.addedAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.books.push(book);
      else groups.push({ key, label, books: [book] });
    }
    return groups;
  }, [filtered]);

  const chip = (active: boolean) => ({
    borderColor: active ? "var(--point)" : "var(--rule)",
    background: active ? "rgba(47,168,79,0.08)" : "var(--card)",
    color: active ? "var(--point-deep)" : "var(--ink-2)",
  });

  return (
    <Section
      title={title ?? `추천도서 ${totalCount}권`}
      flush
      description={
        availableCategories.length > 0 ? (
          <span className="mt-1 flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="d flex-none rounded-full border px-3 py-1 text-xs"
              style={chip(filter === "all")}
            >
              전체 {totalCount}
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className="d flex-none rounded-full border px-3 py-1 text-xs"
                style={chip(filter === category)}
              >
                {category}
              </button>
            ))}
          </span>
        ) : undefined
      }
    >
      {monthGroups.length === 0 && (
        <p className="px-4 py-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 추천도서가 없어요.
        </p>
      )}

      {/* 날짜 · 분야 칩 · 제목 한 줄 목록. 올린 달마다 소제목 띠. 표지는 안
          넣는다 -- 표지는 책장에서 보고, 여기선 "언제 어떤 책이 올라왔나"를 훑는 자리. */}
      {monthGroups.map((group, gIndex) => (
        <div key={group.key} style={gIndex > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}>
          <p className="px-4 pt-3 pb-1 text-xs" style={{ color: "var(--ink-2)" }}>
            <span className="d text-sm" style={{ color: "var(--ink)" }}>
              {group.label}
            </span>{" "}
            {group.books.length}권
          </p>
          {group.books.map((book, index) => {
            const [firstCategory, secondCategory] = book.categories;
            const sameDayAsPrev = index > 0 && group.books[index - 1].addedAt.slice(0, 10) === book.addedAt.slice(0, 10);
            return (
              <LogRow
                key={book.itemId}
                first={index === 0}
                hideDate={sameDayAsPrev}
                rightInteractive
                href={
                  manage
                    ? undefined
                    : `/library/add?bookId=${encodeURIComponent(book.bookId)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(groupId)}`
                }
                dateTop={shortMd(book.addedAt)}
                chip={{
                  label: firstCategory ?? "책",
                  color: categoryColor(firstCategory),
                  sub: secondCategory,
                }}
                title={book.title}
                subtitle={book.author ?? undefined}
                right={
                  manage || !activeChildId ? null : (
                    <span className="-my-1.5 -mr-2 flex items-center">
                      <ShelfBookmark childId={activeChildId} bookId={book.bookId} groupId={groupId} status={book.readStatus} size={20} />
                      <ReadCheck childId={activeChildId} bookId={book.bookId} groupId={groupId} done={book.readStatus === "done"} size={24} />
                    </span>
                  )
                }
              />
            );
          })}
        </div>
      ))}
    </Section>
  );
}
