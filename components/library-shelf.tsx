"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, SpineViewIcon, CoverViewIcon, ListViewIcon } from "@/components/icons/misc-icons";
import { MoreIcon } from "@/components/icons/tab-icons";
import type { ReadingStatus } from "@/lib/reading-status";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";
import ShelfTagPicker from "@/components/shelf-tag-picker";
import ShelfTagManager from "@/components/shelf-tag-manager";
import { createClient } from "@/lib/supabase/client";
import { PLANK_STYLE, chunk, spineColor, spineHeight } from "@/lib/shelf-visual";
import { useRouter } from "next/navigation";

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
  // 우측 상단 "⋯" 메뉴(보기 방식 · 책장 정리 · 내보내기). 자주 안 바꾸는 설정이라 첫 줄에서 뺐다.
  const [menuOpen, setMenuOpen] = useState(false);
  // 책장 정리 모드 -- 책을 눌러 고르고 한 번에 어느 책장으로 옮긴다.
  // 예전엔 책 한 권씩 기록 고치기를 열어 "더 남기기"를 펼쳐야만 책장을
  // 정할 수 있어서, 30권을 나누려면 30번을 반복해야 했다.
  const router = useRouter();
  const [organizing, setOrganizing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  function toggleSelected(recordId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }

  function endOrganizing() {
    setOrganizing(false);
    setSelected(new Set());
    setMoveTo(null);
    setMoveError(null);
    setRenaming(false);
  }

  // 고른 기록들의 shelf_tag_id를 한 번에 바꾼다. null이면 책장에서 뺀다
  // (기록 자체는 그대로 남는다 -- 책장은 분류일 뿐이라서).
  async function moveSelected(tagId: string | null) {
    if (selected.size === 0) return;
    setMoving(true);
    setMoveError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("reading_records")
      .update({ shelf_tag_id: tagId })
      .in("id", Array.from(selected));
    setMoving(false);
    if (error) {
      setMoveError(error.message);
      return;
    }
    endOrganizing();
    router.refresh();
  }

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

  // 실제 기록에 등장하는 것만 뜬다. 드롭다운 하나지만 안에서 두 묶음으로
  // 나눠 보여준다 -- "내 책장"(직접 나눈 shelf_tags)과 "그룹"(학급·기관).
  // 예전엔 한 목록에 섞여 있어서 "그룹 드롭다운인데 왜 책장이 나오냐"는
  // 지적을 받았다. 드롭다운을 둘로 쪼개면 한 줄에 네 개가 되어 더 복잡해지므로
  // optgroup 머리글로만 가른다.
  const { tagOptions, groupOptions } = useMemo(() => {
    const tags = new Map<string, string>();
    const groups = new Map<string, string>();
    for (const book of books) {
      for (const inst of book.instances) {
        if (inst.shelfTagId) tags.set(inst.shelfTagId, inst.shelfTagName ?? "책장");
        if (inst.groupId) groups.set(inst.groupId, inst.groupName ?? "그룹");
      }
    }
    return {
      tagOptions: Array.from(tags.entries()).map(([id, name]) => ({ key: `tag:${id}` as ShelfFilter, name })),
      groupOptions: Array.from(groups.entries()).map(([id, name]) => ({ key: `group:${id}` as ShelfFilter, name })),
    };
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
        <Link
          href="/library/add"
          className="d flex flex-none items-center rounded-[14px] px-3.5 text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          + 책
        </Link>
        <div className="relative flex-none">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="보기 방식과 내보내기"
            aria-expanded={menuOpen}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border"
            style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
          >
            <MoreIcon width={20} height={20} />
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-label="메뉴 닫기" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 z-40 mt-2 w-[180px] overflow-hidden rounded-[16px] border py-1"
                style={{ borderColor: "var(--rule)", background: "var(--card)", boxShadow: "0 8px 24px -8px rgba(38,54,43,0.3)" }}
              >
                <p className="px-4 pt-2 pb-1 text-[11px]" style={{ color: "var(--ink-2)" }}>
                  보기 방식
                </p>
                {(
                  [
                    { value: "cover", label: "전면 책장", Icon: CoverViewIcon },
                    { value: "spine", label: "책등 책장", Icon: SpineViewIcon },
                    { value: "list", label: "읽은 순서 목록", Icon: ListViewIcon },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      switchMode(opt.value);
                      setMenuOpen(false);
                    }}
                    aria-pressed={mode === opt.value}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm"
                    style={{
                      color: mode === opt.value ? "var(--point-deep)" : "var(--ink)",
                      background: mode === opt.value ? "rgba(47,168,79,0.08)" : "transparent",
                    }}
                  >
                    <opt.Icon />
                    {opt.label}
                  </button>
                ))}
                <div className="my-1" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />
                <button
                  type="button"
                  onClick={() => {
                    setOrganizing(true);
                    setMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  책장 정리
                </button>
                <Link href="/library/export" className="block px-4 py-2 text-sm" style={{ color: "var(--ink)" }} onClick={() => setMenuOpen(false)}>
                  내보내기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-[12px] flex items-center gap-1.5">
        <span className="d flex-none text-sm" style={{ color: "var(--ink-2)" }}>
          {mode === "list" ? `${listRows.length}권` : `${filtered.length}권`}
        </span>
        <div className="h-px min-w-[4px] flex-1" style={{ background: "rgba(38,54,43,0.08)" }} />
        {/* 그룹·상태·정렬은 전부 작은 드롭다운 한 줄로 -- 칩 줄 두 개를 없앴다
            (사용자 피드백: 모바일에서 산만). 걸려 있으면 초록 테두리. */}
        {tagOptions.length + groupOptions.length > 0 && (
          <select
            value={shelfFilter}
            onChange={(e) => setShelfFilter(e.target.value as ShelfFilter)}
            aria-label="책장·그룹 필터"
            className="d w-[88px] flex-none truncate rounded-full border px-2 py-1 text-[12px] outline-none"
            style={{
              borderColor: shelfFilter === "all" ? "var(--rule)" : "var(--point)",
              background: shelfFilter === "all" ? "var(--card)" : "rgba(47,168,79,0.08)",
              color: shelfFilter === "all" ? "var(--ink-2)" : "var(--point-deep)",
            }}
          >
            <option value="all">책장·그룹</option>
            {tagOptions.length > 0 && (
              <optgroup label="내 책장">
                {tagOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            )}
            {groupOptions.length > 0 && (
              <optgroup label="그룹">
                {groupOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReadingStatus | "all")}
          aria-label="상태 필터"
          className="d w-[92px] flex-none truncate rounded-full border px-2 py-1 text-[12px] outline-none"
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
          className="d w-[76px] flex-none truncate rounded-full border px-2 py-1 text-[12px] outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {/* 책장 정리 -- ⋯ 메뉴에서 켠다. 책을 눌러 고르고 한 번에 옮긴다.
          책장 이름을 고치거나 지우는 것도 여기서(예전엔 프로필·설정에 있었는데,
          정작 책을 나누는 화면은 책장 탭이라 여기로 옮겼다). */}
      {organizing && (
        <div
          className="mt-[12px] rounded-[var(--r)] border p-4"
          style={{ borderColor: "var(--point)", background: "var(--card)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="d min-w-0 flex-1 truncate text-sm" style={{ color: "var(--point-deep)" }}>
              책장 정리
            </p>
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const ids = (mode === "list" ? listRows : filtered).map((b) => b.recordId);
                  setSelected((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
                }}
                className="d rounded-[14px] border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
              >
                {selected.size === (mode === "list" ? listRows.length : filtered.length) && selected.size > 0
                  ? "선택 해제"
                  : "모두 선택"}
              </button>
              <button
                type="button"
                onClick={endOrganizing}
                className="d rounded-[14px] border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
              >
                끝내기
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs" style={{ color: "var(--ink-2)" }}>
            {selected.size > 0 ? `${selected.size}권 선택 · ` : ""}책을 눌러 고른 다음, 넣을 책장을 고르세요.
          </p>
          <div className="mt-2">
            <ShelfTagPicker childId={childId} value={moveTo} onChange={setMoveTo} label="어느 책장에 넣을까요?" />
          </div>

          {moveError && (
            <p className="mt-2 text-xs" style={{ color: "var(--berry)" }}>
              {moveError}
            </p>
          )}

          {/* 버튼은 하나 -- 고른 책장이 "없음"이면 그대로 책장에서 빼는 동작이라
              "빼기" 버튼을 따로 두면 같은 일을 두 군데서 하게 된다. */}
          <button
            type="button"
            disabled={selected.size === 0 || moving}
            onClick={() => moveSelected(moveTo)}
            className="d mt-3 w-full rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            {moving
              ? "옮기는 중…"
              : moveTo
                ? `선택한 ${selected.size}권 넣기`
                : `선택한 ${selected.size}권 책장에서 빼기`}
          </button>

          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}>
            <button
              type="button"
              onClick={() => setRenaming((v) => !v)}
              className="d text-xs"
              style={{ color: "var(--point-deep)" }}
            >
              책장 이름 고치기 · 지우기 {renaming ? "▴" : "▾"}
            </button>
            {renaming && (
              <div className="mt-2">
                <ShelfTagManager childId={childId} />
              </div>
            )}
          </div>
        </div>
      )}

      {(mode === "list" ? listRows.length === 0 : filtered.length === 0) && (
        <p className="mt-[16px] text-sm" style={{ color: "var(--ink-2)" }}>
          검색 결과가 없어요.
        </p>
      )}

      {filtered.length > 0 && mode === "cover" && (
        <div className="mt-[16px] flex flex-col gap-2">
          {chunk(filtered, 3).map((row, rowIndex) => (
            <div key={rowIndex}>
              {/* 표지는 선반 위에 "올려진" 느낌으로 -- 바닥 그림자를 아래로만 */}
              <div className="grid grid-cols-3 gap-4 px-3">
                {row.map((book) => (
                  <button
                    key={book.bookId}
                    type="button"
                    onClick={() => (organizing ? toggleSelected(book.recordId) : setEditing(book))}
                    className="aspect-[3/4] overflow-hidden rounded-[8px] text-left"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--rule)",
                      boxShadow: selected.has(book.recordId)
                        ? "0 0 0 3px var(--point), 0 4px 6px rgba(38,54,43,0.2)"
                        : "0 4px 6px rgba(38,54,43,0.2)",
                      opacity: organizing && !selected.has(book.recordId) ? 0.55 : 1,
                    }}
                    aria-pressed={organizing ? selected.has(book.recordId) : undefined}
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
        <div className="mt-[16px] flex flex-col gap-5">
          {/* 한 줄에 8권(32px × 8 + 간격 6px × 7 = 298px -- 가장 좁은 폰의 안쪽 폭 326px에 들어감) */}
          {chunk(filtered, 8).map((row, rowIndex) => (
            <div key={rowIndex}>
              <div className="flex items-end gap-1.5 px-3">
                {row.map((book) => (
                  <button
                    key={book.bookId}
                    type="button"
                    onClick={() => (organizing ? toggleSelected(book.recordId) : setEditing(book))}
                    className="flex w-8 flex-none items-start justify-center overflow-hidden rounded-t-[3px] pt-2"
                    style={{
                      height: spineHeight(book.title),
                      background: spineColor(book.title),
                      boxShadow: selected.has(book.recordId)
                        ? "0 0 0 3px var(--point)"
                        : "inset -2px 0 0 rgba(0,0,0,0.12)",
                      opacity: organizing && !selected.has(book.recordId) ? 0.55 : 1,
                    }}
                    aria-pressed={organizing ? selected.has(book.recordId) : undefined}
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
        <div className="mt-[16px] flex flex-col gap-4">
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
                      onClick={() => (organizing ? toggleSelected(row.recordId) : setEditing(row))}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left"
                      aria-pressed={organizing ? selected.has(row.recordId) : undefined}
                      style={selected.has(row.recordId) ? { background: "rgba(47,168,79,0.10)" } : undefined}
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
