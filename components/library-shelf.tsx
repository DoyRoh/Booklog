"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, SpineViewIcon, CoverViewIcon } from "@/components/icons/misc-icons";
import type { ReadingStatus } from "@/lib/reading-status";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";

// 같은 책이 여러 그룹의 숙제로 겹쳐서 나올 수 있으므로(child_id+book_id
// 기준으로 reading_records가 여러 개 있을 수 있다), 책 한 권 = ShelfBook
// 하나로 묶고 그 아래 instances에 그룹별/직접기록 기록들을 모아둔다.
// 기본 화면(전체)에서는 책마다 대표 기록 하나만 카드로 보여줘 중복을 없애고,
// 그룹으로 필터하면 그 그룹에서의 기록을 대표로 보여준다.
export type ShelfInstance = {
  recordId: string;
  groupId: string | null;
  groupName: string | null;
  shelfTagId: string | null;
  shelfTagName: string | null;
  favorite: boolean;
  status: ReadingStatus;
  rating: number | null;
  emotion: string | null;
  memo: string | null;
  readDate: string;
  pagesRead: number | null;
  photoPath: string | null;
  voicePath: string | null;
};

export type ShelfBook = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  instances: ShelfInstance[];
};

type ViewMode = "cover" | "spine";
type StatusFilter = "all" | ReadingStatus;
type GroupFilter = "all" | "direct" | string;
type TagFilter = "all" | string;
type SortMode = "new" | "title" | "author";

const STORAGE_KEY = "chaeksup:library-view";

// library/add·record-edit-modal과 같은 문체("~요"로 끝나는 문장형)로
// 통일한다 -- 예전엔 "읽는 중"/"다 읽음"처럼 단어형이 섞여 있었다.
// 필터 칩과 표지 배지 둘 다 이 라벨을 그대로 쓴다.
const STATUS_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶어요",
  reading: "읽는 중이에요",
  done: "다 읽었어요",
};

const SORT_LABELS: Record<SortMode, string> = {
  new: "최신순",
  title: "제목순",
  author: "작가순",
};

const STATUS_RANK: Record<ReadingStatus, number> = { done: 2, reading: 1, want: 0 };

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

// 필터로 좁혀진 기록들 중 카드에 대표로 보여줄 하나를 고른다 --
// 다 읽음 > 읽는 중 > 읽고 싶어요 순, 그 안에서는 최신 기록 우선.
function pickRepresentative(instances: ShelfInstance[]): ShelfInstance {
  return [...instances].sort((a, b) => {
    const rankDiff = STATUS_RANK[b.status] - STATUS_RANK[a.status];
    if (rankDiff !== 0) return rankDiff;
    return a.readDate < b.readDate ? 1 : -1;
  })[0];
}

type DedupedBook = ShelfBook & ShelfInstance;

function toEditable(book: DedupedBook, childId: string, childName: string | null): EditableRecord {
  return {
    id: book.recordId,
    childId,
    childName,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    status: book.status,
    rating: book.rating,
    emotion: book.emotion,
    favorite: book.favorite,
    memo: book.memo ?? "",
    readDate: book.readDate,
    pagesRead: book.pagesRead,
    shelfTagId: book.shelfTagId,
    photoPath: book.photoPath,
    voicePath: book.voicePath,
  };
}

export default function LibraryShelf({
  childId,
  childName,
  books,
}: {
  childId: string;
  childName: string | null;
  books: ShelfBook[];
}) {
  const [mode, setMode] = useState<ViewMode>("cover");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [sort, setSort] = useState<SortMode>("new");
  const [editing, setEditing] = useState<DedupedBook | null>(null);

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

  const groupOptions = useMemo(() => {
    const byId = new Map<string, string>();
    let hasDirect = false;
    for (const book of books) {
      for (const inst of book.instances) {
        if (inst.groupId) byId.set(inst.groupId, inst.groupName ?? "그룹");
        else hasDirect = true;
      }
    }
    return { hasDirect, groups: Array.from(byId.entries()) };
  }, [books]);

  const tagOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const book of books) {
      for (const inst of book.instances) {
        if (inst.shelfTagId) byId.set(inst.shelfTagId, inst.shelfTagName ?? "이름표");
      }
    }
    return { tags: Array.from(byId.entries()) };
  }, [books]);

  const deduped = useMemo<DedupedBook[]>(() => {
    return books
      .map((book) => {
        const matching = book.instances.filter((inst) => {
          const groupOk =
            groupFilter === "all" ||
            (groupFilter === "direct" ? inst.groupId === null : inst.groupId === groupFilter);
          if (!groupOk) return false;
          return tagFilter === "all" || inst.shelfTagId === tagFilter;
        });
        if (matching.length === 0) return null;
        const rep = pickRepresentative(matching);
        return { ...book, ...rep };
      })
      .filter((book): book is DedupedBook => Boolean(book));
  }, [books, groupFilter, tagFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = deduped
      .filter((book) => statusFilter === "all" || book.status === statusFilter)
      .filter(
        (book) =>
          !q ||
          book.title.toLowerCase().includes(q) ||
          (book.author ?? "").toLowerCase().includes(q)
      );
    const sorted = [...list];
    if (sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    } else if (sort === "author") {
      sorted.sort((a, b) => (a.author ?? "").localeCompare(b.author ?? "", "ko"));
    } else {
      sorted.sort((a, b) => (a.readDate < b.readDate ? 1 : -1));
    }
    return sorted;
  }, [deduped, query, statusFilter, sort]);

  return (
    <div>
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
        <Link
          href="/library/add"
          className="d flex flex-none items-center rounded-[14px] px-3.5 text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          + 책
        </Link>
      </div>

      {(groupOptions.hasDirect || groupOptions.groups.length > 0) && (
        <div className="mt-2 flex items-center gap-2">
          <span className="d flex-none text-xs" style={{ color: "var(--ink-2)" }}>
            출처
          </span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
            {groupOptions.hasDirect && (
              <button
                type="button"
                onClick={() => setGroupFilter(groupFilter === "direct" ? "all" : "direct")}
                className="d flex-none rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: groupFilter === "direct" ? "var(--point)" : "var(--rule)",
                  background: groupFilter === "direct" ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: groupFilter === "direct" ? "var(--point-deep)" : "var(--ink-2)",
                }}
              >
                직접 기록
              </button>
            )}
            {groupOptions.groups.map(([id, name]) => (
              <button
                key={id}
                type="button"
                onClick={() => setGroupFilter(groupFilter === id ? "all" : id)}
                className="d flex-none rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: groupFilter === id ? "var(--point)" : "var(--rule)",
                  background: groupFilter === id ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: groupFilter === id ? "var(--point-deep)" : "var(--ink-2)",
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tagOptions.tags.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="d flex-none text-xs" style={{ color: "var(--ink-2)" }}>
            이름표
          </span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
            {tagOptions.tags.map(([id, name]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTagFilter(tagFilter === id ? "all" : id)}
                className="d flex-none rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: tagFilter === id ? "var(--point)" : "var(--rule)",
                  background: tagFilter === id ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: tagFilter === id ? "var(--point-deep)" : "var(--ink-2)",
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="d flex-none text-xs" style={{ color: "var(--ink-2)" }}>
          상태
        </span>
        <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
          {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(statusFilter === value ? "all" : value)}
              className="d flex-none rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: statusFilter === value ? "var(--point)" : "var(--rule)",
                background: statusFilter === value ? "rgba(47,168,79,0.08)" : "var(--card)",
                color: statusFilter === value ? "var(--point-deep)" : "var(--ink-2)",
              }}
            >
              {STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="d flex-none rounded-full border px-2.5 py-1 text-xs outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="d flex-none text-sm" style={{ color: "var(--ink-2)" }}>
          {filtered.length}권
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(38,54,43,0.08)" }} />
        <Link href="/library/export" className="flex-none text-xs" style={{ color: "var(--point-deep)" }}>
          내보내기
        </Link>
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          검색 결과가 없어요.
        </p>
      )}

      {filtered.length > 0 && mode === "cover" && (
        <div className="mt-5 grid grid-cols-3 gap-4">
          {filtered.map((book) => (
            <button
              key={book.bookId}
              type="button"
              onClick={() => setEditing(book)}
              className="flex flex-col gap-1.5 text-left"
            >
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
              {book.status !== "done" && (
                <span
                  className="d self-start rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: "rgba(232,163,61,0.16)", color: "var(--lantern)" }}
                >
                  {STATUS_LABELS[book.status]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 && mode === "spine" && (
        <div
          className="mt-5 flex flex-wrap items-end gap-1.5 rounded-[10px] border-b-4 p-3"
          style={{ background: "var(--card)", borderColor: "var(--rule)" }}
        >
          {filtered.map((book) => (
            <button
              key={book.bookId}
              type="button"
              onClick={() => setEditing(book)}
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
            </button>
          ))}
        </div>
      )}

      {editing && (
        <RecordEditModal record={toEditable(editing, childId, childName)} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
