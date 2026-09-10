"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, SpineViewIcon, CoverViewIcon, ListViewIcon } from "@/components/icons/misc-icons";
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

// "list"는 예전 기록 탭(읽은 순서대로 월별 목록)을 책장 안으로 합친 것.
export type ViewMode = "cover" | "spine" | "list";
type StatusFilter = "all" | ReadingStatus;
// 책장 필터 하나로 "직접 나눈 책장(shelf_tags)"과 "그룹(학급·기관)"을 함께
// 다룬다 -- 출처/책장 두 줄로 나눠 두니 필터 줄이 너무 많아져서 합쳤다.
type ShelfFilter = "all" | `tag:${string}` | `group:${string}`;
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

// 나무 선반 -- 숲길 배경 그림의 나무 기둥 색(밝은 결 → 몸통 → 아래 그늘)을
// 그대로 뽑아 왔다. 나뭇결 무늬는 일부러 넣지 않는다(표지 이미지와 싸워서
// 산만해짐). 그림의 기둥도 결이 거의 없는 평면이라 톤만 맞추면 충분하다.
// 선반은 얇은 판 하나 -- 두꺼운 통나무 느낌이 아니라 벽에 붙인 가는 선반.
// 위쪽 밝은 결 한 줄 + 앞면 몸통, 아래로 옅은 그림자만(사용자 피드백:
// "두꺼움이 맘에 안 든다, 더 얇고 세련되게").
const PLANK_STYLE = {
  height: 5,
  background: "linear-gradient(#9C8A6B, #7A6247)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 2px 3px rgba(38,54,43,0.22), 0 6px 10px -6px rgba(38,54,43,0.25)",
  borderRadius: 2,
} as const;

// 책등 보기에서 책마다 높이를 조금씩 다르게 -- 전부 같은 높이면 막대그래프처럼
// 보인다. 제목 해시로 고정해서 같은 책은 항상 같은 높이.
function spineHeight(title: string) {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return 124 + (hash % 5) * 9; // 124 ~ 160px
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

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

function formatMonthDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function formatMonth(key: string) {
  const [y, m] = key.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function LibraryShelf({
  childId,
  childName,
  books,
  initialMode,
}: {
  childId: string;
  childName: string | null;
  books: ShelfBook[];
  /** URL(?view=list)로 지정된 보기 -- 있으면 저장된 보기보다 우선 */
  initialMode?: ViewMode;
}) {
  const [mode, setMode] = useState<ViewMode>(initialMode ?? "cover");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [shelfFilter, setShelfFilter] = useState<ShelfFilter>("all");
  const [sort, setSort] = useState<SortMode>("new");
  const [editing, setEditing] = useState<DedupedBook | null>(null);

  useEffect(() => {
    if (initialMode) return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "spine" || saved === "cover" || saved === "list") {
      // 마운트 시 저장된 보기 모드를 한 번만 복원한다(로컬스토리지는 서버
      // 렌더 시점엔 없어서 초기 state로는 읽을 수 없다).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(saved);
    }
  }, [initialMode]);

  function switchMode(next: ViewMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  // 실제 기록에 등장하는 책장(직접 나눈 것)과 그룹만 칩으로 뜬다. 직접
  // 나눈 책장을 먼저, 그룹을 뒤에 둔다.
  const shelfOptions = useMemo(() => {
    const tags = new Map<string, string>();
    const groups = new Map<string, string>();
    for (const book of books) {
      for (const inst of book.instances) {
        if (inst.shelfTagId) tags.set(inst.shelfTagId, inst.shelfTagName ?? "책장");
        if (inst.groupId) groups.set(inst.groupId, inst.groupName ?? "그룹");
      }
    }
    return [
      ...Array.from(tags.entries()).map(([id, name]) => ({ key: `tag:${id}` as ShelfFilter, name })),
      ...Array.from(groups.entries()).map(([id, name]) => ({ key: `group:${id}` as ShelfFilter, name })),
    ];
  }, [books]);

  const deduped = useMemo<DedupedBook[]>(() => {
    return books
      .map((book) => {
        const matching = book.instances.filter((inst) => {
          if (shelfFilter === "all") return true;
          if (shelfFilter.startsWith("tag:")) return inst.shelfTagId === shelfFilter.slice(4);
          return inst.groupId === shelfFilter.slice(6);
        });
        if (matching.length === 0) return null;
        const rep = pickRepresentative(matching);
        return { ...book, ...rep };
      })
      .filter((book): book is DedupedBook => Boolean(book));
  }, [books, shelfFilter]);

  // 목록 보기는 책 단위로 합치지 않고 "읽은 사건" 하나하나(기록)를 그대로
  // 보여준다 -- 같은 책을 두 번 읽었으면 두 줄. 예전 기록 탭의 동작.
  const listRows = useMemo<DedupedBook[]>(() => {
    const q = query.trim().toLowerCase();
    const rows: DedupedBook[] = [];
    for (const book of books) {
      if (q && !book.title.toLowerCase().includes(q) && !(book.author ?? "").toLowerCase().includes(q)) continue;
      for (const inst of book.instances) {
        if (shelfFilter !== "all") {
          const ok = shelfFilter.startsWith("tag:")
            ? inst.shelfTagId === shelfFilter.slice(4)
            : inst.groupId === shelfFilter.slice(6);
          if (!ok) continue;
        }
        if (statusFilter !== "all" && inst.status !== statusFilter) continue;
        rows.push({ ...book, ...inst });
      }
    }
    if (sort === "title") rows.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    else if (sort === "author") rows.sort((a, b) => (a.author ?? "").localeCompare(b.author ?? "", "ko"));
    else rows.sort((a, b) => (a.readDate < b.readDate ? 1 : -1));
    return rows;
  }, [books, query, shelfFilter, statusFilter, sort]);

  const listByMonth = useMemo(() => {
    const groups: { key: string; rows: DedupedBook[] }[] = [];
    for (const row of listRows) {
      const key = row.readDate.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else groups.push({ key, rows: [row] });
    }
    return groups;
  }, [listRows]);

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
          <button
            type="button"
            onClick={() => switchMode("list")}
            aria-pressed={mode === "list"}
            aria-label="읽은 순서 목록으로 보기"
            className="flex items-center justify-center px-3"
            style={{
              background: mode === "list" ? "var(--point)" : "var(--card)",
              color: mode === "list" ? "#fff" : "var(--ink-2)",
            }}
          >
            <ListViewIcon />
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

      {shelfOptions.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="d flex-none text-xs" style={{ color: "var(--ink-2)" }}>
            그룹
          </span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
            {shelfOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setShelfFilter(shelfFilter === option.key ? "all" : option.key)}
                className="d flex-none rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: shelfFilter === option.key ? "var(--point)" : "var(--rule)",
                  background: shelfFilter === option.key ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: shelfFilter === option.key ? "var(--point-deep)" : "var(--ink-2)",
                }}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <span className="d flex-none text-sm" style={{ color: "var(--ink-2)" }}>
          {mode === "list" ? `${listRows.length}권` : `${filtered.length}권`}
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(38,54,43,0.08)" }} />
        {/* 상태 필터는 칩 한 줄 대신 정렬 옆 작은 드롭다운으로 -- 매일 쓰는
            조작이 아니라서 첫눈에 보이는 줄 수를 줄인다(사용자 피드백).
            걸려 있으면 초록 테두리로 표시. */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReadingStatus | "all")}
          aria-label="상태 필터"
          className="d flex-none rounded-full border px-2.5 py-1 text-xs outline-none"
          style={{
            borderColor: statusFilter === "all" ? "var(--rule)" : "var(--point)",
            background: statusFilter === "all" ? "var(--card)" : "rgba(47,168,79,0.08)",
            color: statusFilter === "all" ? "var(--ink-2)" : "var(--point-deep)",
          }}
        >
          <option value="all">모든 상태</option>
          {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="정렬"
          className="d flex-none rounded-full border px-2.5 py-1 text-xs outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
        <Link href="/library/export" className="flex-none text-xs" style={{ color: "var(--point-deep)" }}>
          내보내기
        </Link>
      </div>

      {(mode === "list" ? listRows.length === 0 : filtered.length === 0) && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          검색 결과가 없어요.
        </p>
      )}

      {filtered.length > 0 && mode === "cover" && (
        <div className="mt-5 flex flex-col gap-2">
          {chunk(filtered, 3).map((row, rowIndex) => (
            <div key={rowIndex}>
              {/* 표지는 선반 위에 "올려진" 느낌으로 -- 바닥 그림자를 아래로만 */}
              <div className="grid grid-cols-3 gap-4 px-3">
                {row.map((book) => (
                  <button
                    key={book.bookId}
                    type="button"
                    onClick={() => setEditing(book)}
                    className="aspect-[3/4] overflow-hidden rounded-[8px] text-left"
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
                      <div className="flex h-full items-center justify-center p-2 text-center">
                        <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
                          {book.title}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div style={PLANK_STYLE} />
              <div className="mt-1.5 grid grid-cols-3 gap-4 px-3">
                {row.map((book) => (
                  <div key={book.bookId} className="flex flex-col items-center gap-1">
                    <p className="w-full truncate text-center text-xs" style={{ color: "var(--ink-2)" }}>
                      {book.title}
                    </p>
                    {/* 세 상태 모두 배지로 -- 다 읽은 책만 없으면 "왜 안 뜨지"로 읽힌다(사용자 피드백). */}
                    <span
                      className="d rounded-full px-2 py-0.5 text-[10px]"
                      style={
                        book.status === "done"
                          ? { background: "rgba(47,168,79,0.14)", color: "var(--point-deep)" }
                          : { background: "rgba(232,163,61,0.16)", color: "var(--lantern)" }
                      }
                    >
                      {STATUS_LABELS[book.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && mode === "spine" && (
        <div className="mt-5 flex flex-col gap-5">
          {/* 한 줄에 8권(32px × 8 + 간격 6px × 7 = 298px -- 가장 좁은 폰의 안쪽 폭 326px에 들어감) */}
          {chunk(filtered, 8).map((row, rowIndex) => (
            <div key={rowIndex}>
              <div className="flex items-end gap-1.5 px-3">
                {row.map((book) => (
                  <button
                    key={book.bookId}
                    type="button"
                    onClick={() => setEditing(book)}
                    className="flex w-8 flex-none items-start justify-center overflow-hidden rounded-t-[3px] pt-2"
                    style={{
                      height: spineHeight(book.title),
                      background: spineColor(book.title),
                      boxShadow: "inset -2px 0 0 rgba(0,0,0,0.12)",
                    }}
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
              <div style={PLANK_STYLE} />
            </div>
          ))}
        </div>
      )}

      {listRows.length > 0 && mode === "list" && (
        <div className="mt-4 flex flex-col gap-4">
          {(sort === "new" ? listByMonth : [{ key: "", rows: listRows }]).map((group) => (
            <div key={group.key || "all"}>
              {group.key && (
                <p className="d mb-2 text-sm">
                  {formatMonth(group.key)}
                  <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--ink-2)" }}>
                    {group.rows.length}권
                  </span>
                </p>
              )}
              <div
                className="overflow-hidden rounded-[var(--r)] border"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                {group.rows.map((row, index) => (
                  <div key={row.recordId}>
                    {index > 0 && <div className="mx-4" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />}
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left"
                    >
                      {row.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.coverUrl} alt="" className="h-11 w-8 flex-none rounded object-cover" />
                      ) : (
                        <div className="h-11 w-8 flex-none rounded" style={{ background: "var(--paper)" }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="d truncate text-sm">{row.title}</p>
                        {(row.groupName || row.shelfTagName || row.status !== "done") && (
                          <p className="truncate text-[11px]" style={{ color: "var(--ink-2)" }}>
                            {[row.status !== "done" ? STATUS_LABELS[row.status] : null, row.shelfTagName, row.groupName]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <span className="flex-none text-xs" style={{ color: "var(--ink-2)" }}>
                        {formatMonthDay(row.readDate)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RecordEditModal record={toEditable(editing, childId, childName)} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
