"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShelfBookmark } from "@/components/read-toggles";
import ViewToggle from "@/components/view-toggle";
import { BOOK_CATEGORIES } from "@/lib/categories";
import type { RecommendBook } from "@/lib/recommend-books";

// 아이·부모가 보는 숲길(추천도서) = 서점·도서관 둘러보기. 숙제 목록처럼
// 날짜·칩·줄로 나열하지 않고, 표지를 선반에 올려 훑어보다가 마음에 드는
// 책을 책갈피로 내 책장에 꽂고 빼는 자리다. 진행률 카드·등불·숙제 표시는
// 없다(사용자 피드백: "숙제랑 구분도 안 되고 정신 사납다"). 숲지기의 관리
// 목록은 recommend-book-list.tsx(manage) 그대로.
//
// 추천도서는 숙제가 아니라서 "완료"를 요구하지 않는다(사용자 요청) --
// 표지 = "읽어보기"(기록 화면으로 이동), 책갈피 = 담아두기(탐색 중
// 흥미로운 책을 표시)만 남기고, 완료 체크(ReadCheck)는 뺐다.
const PLANK_STYLE = {
  height: 5,
  background: "linear-gradient(#9C8A6B, #7A6247)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 2px 3px rgba(38,54,43,0.22), 0 6px 10px -6px rgba(38,54,43,0.25)",
  borderRadius: 2,
} as const;

const SPINE_COLORS = ["#6B8F71", "#A6763F", "#D9A441", "#7C9C82", "#B5654A", "#5E7A6B", "#C9A66B"];

function coverColor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const OVERLAY_BTN =
  "flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-[0_1px_3px_rgba(38,54,43,0.25)]";

type ShelfMode = "cover" | "list";

const MODE_STORAGE_KEY = "chaeksup:recommend-shelf-view";

export default function RecommendShelf({
  groupId,
  books,
  activeChildId,
  footnote,
}: {
  groupId: string;
  books: RecommendBook[];
  activeChildId: string | null;
  /** 선반 아래 한 줄 안내(예: 팔로우 전 미리보기 안내). */
  footnote?: React.ReactNode;
}) {
  const [filter, setFilter] = useState<"all" | string>("all");
  // 표지 선반(전면) 보기가 기본 -- 책장 탭·숲지기 추천도서 탭과 같은
  // 이유(둘러보기)로 표지가 우선이지만, "목록형으로도 볼 수 있게"라는
  // 요청으로 목록 보기를 추가했다. 마지막 보기 모드는 localStorage에 저장.
  const [mode, setMode] = useState<ShelfMode>("cover");

  useEffect(() => {
    const saved = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === "cover" || saved === "list") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(saved);
    }
  }, []);

  function switchMode(next: ShelfMode) {
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const book of books) for (const c of book.categories) set.add(c);
    const standard = BOOK_CATEGORIES.filter((c) => set.has(c));
    const extra = Array.from(set).filter((c) => !(BOOK_CATEGORIES as readonly string[]).includes(c)).sort();
    return [...standard, ...extra];
  }, [books]);

  const filtered = useMemo(
    () => (filter === "all" ? books : books.filter((b) => b.categories.includes(filter))),
    [books, filter]
  );
  const doneCount = filtered.filter((b) => b.readStatus === "done").length;

  const chip = (active: boolean) => ({
    borderColor: active ? "var(--point)" : "var(--rule)",
    background: active ? "rgba(47,168,79,0.08)" : "var(--card)",
    color: active ? "var(--point-deep)" : "var(--ink-2)",
  });

  if (books.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        아직 올라온 추천도서가 없어요.
      </p>
    );
  }

  return (
    <div>
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setFilter("all")} className="d flex-none rounded-full border px-3.5 py-1.5 text-sm" style={chip(filter === "all")}>
            전체
          </button>
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => setFilter(category)} className="d flex-none rounded-full border px-3.5 py-1.5 text-sm" style={chip(filter === category)}>
              {category}
            </button>
          ))}
        </div>
      )}

      {/* 시안 그대로: "N권 · 읽은 책 M권" 왼쪽, 오른쪽엔 배경도 테두리도 없는
          채움 아이콘 두 개(켜진 쪽만 초록). 구분선·드롭다운은 없앴다. */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm" style={{ color: "var(--ink-2)" }}>
          {filtered.length}권{activeChildId ? ` · 읽은 책 ${doneCount}권` : ""}
        </span>
        <span className="flex-1" />
        <ViewToggle mode={mode} onChange={switchMode} />
      </div>

      {mode === "list" ? (
        // 이미 흰 카드 안이라 목록에 또 박스를 두르지 않는다(박스 안 박스는
        // 복잡해 보인다는 지적) -- 줄 사이 옅은 구분선만.
        <div className="mt-4">
          {filtered.map((book, index) => {
            const bookGroupId = book.groupId ?? groupId;
            const href = `/library/add?bookId=${encodeURIComponent(book.bookId)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(bookGroupId)}`;
            return (
              <div
                key={book.itemId}
                id={`book-${book.itemId}`}
                className="flex items-center gap-2.5 py-3"
                style={{ scrollMarginTop: "190px", ...(index === 0 ? {} : { borderTop: "1px solid rgba(38,54,43,0.08)" }) }}
              >
                <Link href={href} aria-label={`${book.title} 읽어보기`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverUrl} alt="" className="h-11 w-8 flex-none rounded object-cover" />
                  ) : (
                    <div className="h-11 w-8 flex-none rounded" style={{ background: coverColor(book.title) }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{book.title}</p>
                    {book.author && (
                      <p className="mt-0.5 truncate text-xs" style={{ color: "var(--ink-2)" }}>
                        {book.author}
                      </p>
                    )}
                  </div>
                </Link>
                {activeChildId && (
                  <ShelfBookmark
                    childId={activeChildId}
                    bookId={book.bookId}
                    groupId={bookGroupId}
                    status={book.readStatus}
                    size={17}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
      /* 3권씩 선반 한 칸. 표지를 누르면 기록 남기기(책 정보 미리 채움),
          표지 오른쪽 위 책갈피 = 내 책장에 꽂기/빼기, 오른쪽 아래 체크 = 읽었어요. */
      <div className="mt-5 flex flex-col gap-5">
        {chunk(filtered, 3).map((row, rowIndex) => (
          <div key={rowIndex}>
            <div className="grid grid-cols-3 gap-4 px-3">
              {row.map((book) => {
                const bookGroupId = book.groupId ?? groupId;
                const href = `/library/add?bookId=${encodeURIComponent(book.bookId)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(bookGroupId)}`;
                return (
                  <div key={book.itemId} id={`book-${book.itemId}`} className="relative" style={{ scrollMarginTop: "190px" }}>
                    <Link
                      href={href}
                      aria-label={`${book.title} 읽어보기`}
                      className="block aspect-[3/4] overflow-hidden rounded-[8px]"
                      style={{
                        background: book.coverUrl ? "var(--card)" : coverColor(book.title),
                        border: "1px solid var(--rule)",
                        boxShadow: "0 4px 6px rgba(38,54,43,0.2)",
                      }}
                    >
                      {book.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center p-2 text-center">
                          <span
                            className="d text-sm text-white"
                            style={{
                              overflowWrap: "anywhere",
                              display: "-webkit-box",
                              WebkitLineClamp: 5,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {book.title}
                          </span>
                        </span>
                      )}
                    </Link>
                    {activeChildId && (
                      <span className="absolute -top-1 -right-1">
                        <ShelfBookmark childId={activeChildId} bookId={book.bookId} groupId={bookGroupId} status={book.readStatus} size={16} className={OVERLAY_BTN} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2" style={PLANK_STYLE} />
            <div className="mt-2 grid grid-cols-3 gap-4 px-3">
              {row.map((book) => (
                <div key={book.itemId} className="min-w-0">
                  <p
                    className="text-sm leading-snug"
                    style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  >
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--ink-2)" }}>
                      {book.author}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
      {footnote && (
        <p className="mt-2 text-center text-xs" style={{ color: "var(--ink-2)" }}>
          {footnote}
        </p>
      )}
    </div>
  );
}
