"use client";

import { useMemo, useState } from "react";
import Illustration, { PawStamp, type Avatar } from "@/components/illustration";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BOOK_CATEGORIES, categoryColor } from "@/lib/categories";
import { LogGroup, LogRow, monthOf, shortDate, shortMd } from "@/components/log-row";
import type { RecommendBook } from "@/lib/recommend-books";

export type { RecommendBook };

type Filter = "all" | string;

// HABA 100처럼 "N/M권 · P%" 진행률 카드 + 날짜·분야 칩·제목 한 줄 목록(달별).
// 추천도서는 그룹의 "책 서랍"이라 강제 표시(필독)는 두지 않는다 -- 꼭 읽어야
// 할 책은 숙제로 낸다. 대신 책마다 두 가지 표시만 붙는다: 지금 진행 중인
// 숙제에 들어간 책은 등불("숙제 중"), 아이가 다 읽은 책은 발자국 도장.
export default function RecommendBookList({
  groupId,
  listName,
  books,
  activeChildId,
  childAvatar = null,
  manage = false,
}: {
  groupId: string;
  listName: string;
  books: RecommendBook[];
  activeChildId: string | null;
  childAvatar?: Avatar | null;
  /** 숲지기 관리 화면: 진행률·"책장에 꽂기" 없이 목록만. */
  manage?: boolean;
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
      {!manage && (
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
      )}

      <div className={`${manage ? "" : "mt-3 "}flex gap-1.5 overflow-x-auto pb-1`}>
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

      {monthGroups.length === 0 && (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 추천도서가 없어요.
        </p>
      )}

      {/* 날짜 · 분야 칩 · 제목 한 줄 목록(육아 기록 앱의 목록 형식). 올린
          달마다 박스 하나. 분야는 왼쪽 색 칩으로만 구분하고 표지는 안 넣는다
          -- 표지는 책장에서 보고, 여기선 "언제 어떤 책이 올라왔나"를 훑는 자리. */}
      <div className="mt-4 flex flex-col gap-4">
        {monthGroups.map((group) => (
          <LogGroup key={group.key} heading={group.label} headingSub={`${group.books.length}권`}>
            {group.books.map((book, index) => {
              const [firstCategory, secondCategory] = book.categories;
              return (
                <LogRow
                  key={book.itemId}
                  first={index === 0}
                  dateTop={shortMd(book.addedAt)}
                  dateBottom={shortDate(book.addedAt)}
                  chip={{
                    label: firstCategory ?? "책",
                    color: categoryColor(firstCategory),
                    sub: secondCategory,
                  }}
                  title={book.title}
                  subtitle={
                    book.author || book.inAssignment ? (
                      <>
                        {book.inAssignment && (
                          <span
                            className="mr-1.5 inline-flex items-center gap-0.5 align-middle"
                            style={{ color: "var(--lantern)" }}
                          >
                            <Illustration name="lantern-on" height={13} />
                            숙제 중
                          </span>
                        )}
                        {book.author}
                      </>
                    ) : undefined
                  }
                  right={
                    manage || !activeChildId ? null : book.readStatus === "done" ? (
                      <span
                        className="d flex items-center gap-1 text-xs"
                        style={{ color: "var(--point-deep)" }}
                        aria-label="읽었어요"
                      >
                        <PawStamp avatar={childAvatar} height={20} />
                        읽었어요
                      </span>
                    ) : book.readStatus === "reading" ? (
                      <span className="d text-xs" style={{ color: "var(--lantern)" }}>
                        읽는 중
                      </span>
                    ) : book.readStatus === "want" ? (
                      <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
                        읽고 싶어요
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={pinning === book.bookId}
                        onClick={() => pinToShelf(book)}
                        className="d rounded-full border px-2.5 py-1 text-[11px] disabled:opacity-40"
                        style={{ borderColor: "var(--point)", color: "var(--point-deep)" }}
                      >
                        {pinning === book.bookId ? "꽂는 중" : "책장에 꽂기"}
                      </button>
                    )
                  }
                />
              );
            })}
          </LogGroup>
        ))}
      </div>
    </div>
  );
}
