"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ManagedLogList, { type ManagedRow } from "@/components/managed-log-list";
import { shortMd } from "@/components/log-row";
import Illustration from "@/components/illustration";
import { categoryColor } from "@/lib/categories";
import type { OperatorBook } from "@/lib/operator-books";
import { PLANK_STYLE, chunk, spineColor, spineHeight } from "@/lib/shelf-visual";

type ViewMode = "list" | "cover" | "spine";

const VIEW_LABELS: Record<ViewMode, string> = {
  list: "목록 보기",
  cover: "전면 보기",
  spine: "책등 보기",
};

const STORAGE_KEY = "chaeksup:teacher-books-view";

/**
 * 숲지기의 추천도서 목록 -- 아이의 책장 탭과 같은 세 가지 보기(전면·책등·목록)와
 * 분야 필터를 얹었다. 목록 보기에만 순번(맨 왼쪽)·추가·선택·삭제가 있고(관리
 * 화면의 본체), 전면·책등은 "우리 서랍에 어떤 책이 있나"를 표지로 훑어보는 용도라
 * 누르면 그 책의 상세(아이별 읽은 현황)로 간다.
 */
export default function OperatorBookBrowser({
  groupId,
  memberCount,
  books,
}: {
  groupId: string;
  memberCount: number;
  books: OperatorBook[];
}) {
  // 표지를 훑어보는 "전면 보기"가 기본(사용자 요청) -- 관리(추가·선택·삭제)가
  // 필요하면 드롭다운에서 "목록 보기"로 바꾸면 된다. "+ 책 추가"는 아래
  // 컨트롤 줄에도 항상 있어서 목록 보기로 안 바꿔도 바로 올릴 수 있다.
  const [mode, setMode] = useState<ViewMode>("cover");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "list" || saved === "cover" || saved === "spine") {
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

  // 실제로 올린 책에 붙어 있는 분야만 칩으로 (가나다순).
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const book of books) for (const c of book.categories) set.add(c);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [books]);

  const filtered = useMemo(
    () => (category === "all" ? books : books.filter((b) => b.categories.includes(category))),
    [books, category]
  );

  const rows: ManagedRow[] = filtered.map((book, index) => {
    const [firstCategory, secondCategory] = book.categories;
    return {
      id: book.itemId,
      index: index + 1,
      href: `/teacher/books/${book.bookId}?group=${groupId}`,
      dateTop: shortMd(book.addedAt),
      hideDate: index > 0 && filtered[index - 1].addedAt.slice(0, 10) === book.addedAt.slice(0, 10),
      chip: { label: firstCategory ?? "책", color: categoryColor(firstCategory), sub: secondCategory },
      title: book.title,
      subtitle: book.author ?? undefined,
      lantern: book.inAssignment,
      right: `${book.readCount}/${memberCount}명`,
      rightTone: book.readCount > 0 ? "good" : "muted",
    };
  });

  return (
    <div>
      {/* 분야 필터 -- 실제 분야가 둘 이상일 때만(하나뿐이면 고를 게 없다) */}
      {categories.length > 1 && (
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          <span className="d flex-none self-center text-xs" style={{ color: "var(--ink-2)" }}>
            분야
          </span>
          {categories.map((name) => {
            const on = category === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(on ? "all" : name)}
                className="d flex-none rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: on ? categoryColor(name) : "var(--rule)",
                  background: on ? categoryColor(name) : "var(--card)",
                  color: on ? "#fff" : "var(--ink-2)",
                }}
                aria-pressed={on}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* N권 ─── + 책 추가 · 보기 ▾ · 내보내기 (책장 탭의 컨트롤 줄과 같은
          모양). "+ 책 추가"는 목록 보기의 ManagedLogList 안에도 있지만,
          기본 보기가 전면·책등으로 바뀌면서 그 화면에서도 바로 올릴 수
          있게 여기 한 번 더 뒀다. */}
      <div className="mt-[12px] flex items-center gap-2">
        <span className="d flex-none text-sm" style={{ color: "var(--ink-2)" }}>
          {filtered.length}권
        </span>
        <div className="h-px min-w-[4px] flex-1" style={{ background: "rgba(38,54,43,0.08)" }} />
        <Link
          href={`/teacher/books/add?group=${groupId}`}
          className="d flex-none rounded-full border px-3 py-1 text-[12px]"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
        >
          + 책 추가
        </Link>
        <select
          value={mode}
          onChange={(e) => switchMode(e.target.value as ViewMode)}
          aria-label="보기 방식"
          className="d w-[92px] flex-none truncate rounded-full border px-2 py-1 text-[12px] outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
        >
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((value) => (
            <option key={value} value={value}>
              {VIEW_LABELS[value]}
            </option>
          ))}
        </select>
        <Link
          href={`/teacher/export?group=${groupId}&type=books`}
          className="d flex-none rounded-full border px-3 py-1 text-[12px]"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
        >
          내보내기
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          {books.length === 0 ? "아직 추천도서가 없어요. ‘+ 책 추가’로 올려 주세요." : "이 분야의 책이 없어요."}
        </p>
      ) : mode === "list" ? (
        <div className="mt-[12px]">
          <ManagedLogList
            heading="추천도서"
            headingSub={`${filtered.length}권`}
            addHref={`/teacher/books/add?group=${groupId}`}
            addLabel="+ 책 추가"
            rows={rows}
            emptyText="아직 추천도서가 없어요. ‘+ 책 추가’로 올려 주세요."
            table="book_list_items"
            deleteNoun="추천도서에서 뺄까요? (아이들의 기록은 남아요)"
          />
        </div>
      ) : mode === "cover" ? (
        <div className="mt-[16px] flex flex-col gap-2">
          {chunk(filtered, 3).map((row, rowIndex) => (
            <div key={rowIndex}>
              <div className="grid grid-cols-3 gap-4 px-3">
                {row.map((book) => (
                  <Link
                    key={book.itemId}
                    href={`/teacher/books/${book.bookId}?group=${groupId}`}
                    className="aspect-[3/4] overflow-hidden rounded-[8px]"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--rule)",
                      boxShadow: "0 4px 6px rgba(38,54,43,0.2)",
                    }}
                    aria-label={book.title}
                  >
                    {book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center p-2 text-center">
                        <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
                          {book.title}
                        </span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <div style={PLANK_STYLE} />
              <div className="mt-1.5 grid grid-cols-3 gap-4 px-3">
                {row.map((book) => (
                  <div key={book.itemId} className="flex flex-col items-center gap-1">
                    <p className="w-full truncate text-center text-xs" style={{ color: "var(--ink-2)" }}>
                      {book.title}
                    </p>
                    <span
                      className="d flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px]"
                      style={
                        book.readCount > 0
                          ? { background: "rgba(47,168,79,0.14)", color: "var(--point-deep)" }
                          : { background: "var(--paper)", color: "var(--ink-2)" }
                      }
                    >
                      {book.inAssignment && <Illustration name="lantern-on" height={11} />}
                      {book.readCount}/{memberCount}명
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-[16px] flex flex-col gap-5">
          {/* 한 줄에 8권 -- 아이의 책장 책등 보기와 같은 규격 */}
          {chunk(filtered, 8).map((row, rowIndex) => (
            <div key={rowIndex}>
              <div className="flex items-end gap-1.5 px-3">
                {row.map((book) => (
                  <Link
                    key={book.itemId}
                    href={`/teacher/books/${book.bookId}?group=${groupId}`}
                    className="flex w-8 flex-none items-start justify-center overflow-hidden rounded-t-[3px] pt-2"
                    style={{
                      height: spineHeight(book.title),
                      background: spineColor(book.title),
                      boxShadow: "inset -2px 0 0 rgba(0,0,0,0.12)",
                    }}
                    title={`${book.title} · ${book.readCount}/${memberCount}명 읽음`}
                  >
                    <span
                      className="d block text-[11px] leading-none text-white"
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed", maxHeight: "148px", overflow: "hidden" }}
                    >
                      {book.title}
                    </span>
                  </Link>
                ))}
              </div>
              <div style={PLANK_STYLE} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
