"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchIcon, SpineViewIcon, CoverViewIcon } from "@/components/icons/misc-icons";

export type ShelfBook = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  favorite: boolean;
};

type ViewMode = "cover" | "spine";

const STORAGE_KEY = "chaeksup:library-view";

// 책등 색상 — 세이지그린 숲 컨셉과 어울리는 팔레트(이끼/나무껍질/등불/흙빛)에서
// 책 제목 해시로 고정 배정해, 같은 책은 항상 같은 색으로 보이게 한다.
const SPINE_COLORS = ["#6B8F71", "#A6763F", "#D9A441", "#7C9C82", "#B5654A", "#5E7A6B", "#C9A66B"];

function spineColor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}

export default function LibraryShelf({ books }: { books: ShelfBook[] }) {
  const [mode, setMode] = useState<ViewMode>("cover");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "spine" || saved === "cover") {
      // 마운트 시 저장된 보기 모드를 한 번만 복원한다(로컬스토리지는 서버
      // 렌더 시점엔 없어서 초기 state로는 읽을 수 없다).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(saved);
    }
  }, []);

  function switchMode(next: ViewMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(q) || (book.author ?? "").toLowerCase().includes(q)
    );
  }, [books, query]);

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--ink-2)" }}
          />
          <input
            type="text"
            placeholder="책 제목이나 작가로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-[14px] border py-2.5 pl-10 pr-4 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
        </div>
        <div className="flex overflow-hidden rounded-[14px] border" style={{ borderColor: "var(--rule)" }}>
          <button
            type="button"
            onClick={() => switchMode("cover")}
            aria-pressed={mode === "cover"}
            aria-label="전면 책장으로 보기"
            className="flex items-center justify-center px-3"
            style={{
              background: mode === "cover" ? "var(--point)" : "var(--card)",
              color: mode === "cover" ? "#fff" : "var(--ink-2)",
            }}
          >
            <CoverViewIcon />
          </button>
          <button
            type="button"
            onClick={() => switchMode("spine")}
            aria-pressed={mode === "spine"}
            aria-label="책등 책장으로 보기"
            className="flex items-center justify-center px-3"
            style={{
              background: mode === "spine" ? "var(--point)" : "var(--card)",
              color: mode === "spine" ? "#fff" : "var(--ink-2)",
            }}
          >
            <SpineViewIcon />
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          검색 결과가 없어요.
        </p>
      )}

      {filtered.length > 0 && mode === "cover" && (
        <div className="mt-5 grid grid-cols-3 gap-4">
          {filtered.map((book) => (
            <div key={book.id} className="flex flex-col gap-1.5">
              <div
                className="aspect-[3/4] overflow-hidden rounded-[10px]"
                style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
              >
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center">
                    <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
                      {book.title}
                    </span>
                  </div>
                )}
              </div>
              <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                {book.title}
              </p>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && mode === "spine" && (
        <div
          className="mt-5 flex flex-wrap items-end gap-1.5 rounded-[10px] border-b-4 p-3"
          style={{ background: "var(--card)", borderColor: "var(--rule)" }}
        >
          {filtered.map((book) => (
            <div
              key={book.id}
              className="flex h-40 w-8 flex-none items-start justify-center overflow-hidden rounded-[4px] pt-2 shadow-sm"
              style={{ background: spineColor(book.title) }}
              title={book.title}
            >
              <span
                className="d block text-[11px] leading-none text-white"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  maxHeight: "148px",
                  overflow: "hidden",
                }}
              >
                {book.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
