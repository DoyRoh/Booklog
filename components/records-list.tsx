"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons/misc-icons";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";
import type { ReadingStatus } from "@/lib/reading-status";

export type RecordRow = {
  id: string;
  groupId: string | null;
  groupName: string | null;
  status: ReadingStatus;
  rating: number | null;
  emotion: string | null;
  favorite: boolean;
  parentMemo: string | null;
  readDate: string;
  photoSignedUrl: string | null;
  voiceSignedUrl: string | null;
  bookTitle: string;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
};

type GroupFilter = "all" | "direct" | string;
type SortMode = "new" | "title" | "author";

const STATUS_BADGE_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶어요",
  reading: "읽는 중",
  done: "다 읽음",
};

const SORT_LABELS: Record<SortMode, string> = {
  new: "최신순",
  title: "제목순",
  author: "작가순",
};

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function RecordsList({ childName, records }: { childName: string; records: RecordRow[] }) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [sort, setSort] = useState<SortMode>("new");
  const [editing, setEditing] = useState<RecordRow | null>(null);

  const groupOptions = useMemo(() => {
    const byId = new Map<string, string>();
    let hasDirect = false;
    for (const r of records) {
      if (r.groupId) byId.set(r.groupId, r.groupName ?? "그룹");
      else hasDirect = true;
    }
    return { hasDirect, groups: Array.from(byId.entries()) };
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter((r) => {
        if (groupFilter === "all") return true;
        if (groupFilter === "direct") return r.groupId === null;
        return r.groupId === groupFilter;
      })
      .filter(
        (r) =>
          !q || r.bookTitle.toLowerCase().includes(q) || (r.bookAuthor ?? "").toLowerCase().includes(q)
      );
  }, [records, query, groupFilter]);

  const sortedFlat = useMemo(() => {
    if (sort === "new") return null;
    const list = [...filtered];
    if (sort === "title") list.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle, "ko"));
    else list.sort((a, b) => (a.bookAuthor ?? "").localeCompare(b.bookAuthor ?? "", "ko"));
    return list;
  }, [filtered, sort]);

  const grouped = useMemo(() => {
    if (sortedFlat) return null;
    const map = new Map<string, RecordRow[]>();
    for (const r of filtered) {
      const key = r.readDate.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered, sortedFlat]);

  const doneCount = records.filter((r) => r.status === "done").length;
  const ratedRecords = records.filter((r) => r.rating);
  const avgRating = ratedRecords.length
    ? ratedRecords.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratedRecords.length
    : null;

  function toEditable(r: RecordRow): EditableRecord {
    return {
      id: r.id,
      title: r.bookTitle,
      author: r.bookAuthor,
      coverUrl: r.bookCoverUrl,
      status: r.status,
      rating: r.rating,
      emotion: r.emotion,
      favorite: r.favorite,
      memo: r.parentMemo ?? "",
    };
  }

  function renderRow(record: RecordRow, withTopBorder: boolean) {
    return (
      <div key={record.id} className="p-4" style={withTopBorder ? { borderTop: "1px solid var(--rule)" } : undefined}>
        <button type="button" onClick={() => setEditing(record)} className="flex w-full gap-3 text-left">
          {record.bookCoverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.bookCoverUrl} alt="" className="h-20 w-14 flex-none rounded object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="d truncate text-base">{record.bookTitle}</p>
              {record.favorite && (
                <span className="flex-none text-xs" style={{ color: "var(--berry)" }}>
                  즐겨찾는 책
                </span>
              )}
            </div>
            {record.bookAuthor && (
              <p className="truncate text-sm" style={{ color: "var(--ink-2)" }}>
                {record.bookAuthor}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
              <span>{record.readDate}</span>
              {record.rating && <span>· 평점 {record.rating}</span>}
              {record.emotion && <span>· {record.emotion}</span>}
              {record.groupName && <span>· {record.groupName}</span>}
              {record.status !== "done" && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: "rgba(232,163,61,0.16)", color: "var(--lantern)" }}
                >
                  {STATUS_BADGE_LABELS[record.status]}
                </span>
              )}
            </div>
            {record.parentMemo && (
              <p className="mt-2 truncate text-sm" style={{ color: "var(--ink)" }}>
                {record.parentMemo}
              </p>
            )}
          </div>
        </button>
        {record.photoSignedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.photoSignedUrl} alt="" className="mt-2 h-24 w-full rounded-[10px] object-cover" />
        )}
        {record.voiceSignedUrl && <audio src={record.voiceSignedUrl} controls className="mt-2 h-9 w-full" />}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div
        className="flex items-center justify-between rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <span className="d text-base">{childName} 독서기록</span>
        <span className="text-sm" style={{ color: "var(--ink-2)" }}>
          총 {doneCount}권{avgRating ? ` · 평균 ${avgRating.toFixed(1)}점` : ""}
        </span>
      </div>

      <div className="relative mt-3">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--ink-2)" }}
        />
        <input
          type="text"
          placeholder="책 제목이나 작가로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-[14px] border py-2.5 pl-10 pr-4 text-sm outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />
      </div>

      {(groupOptions.hasDirect || groupOptions.groups.length > 0) && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setGroupFilter("all")}
            className="d flex-none rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: groupFilter === "all" ? "var(--point)" : "var(--rule)",
              background: groupFilter === "all" ? "rgba(47,168,79,0.08)" : "var(--card)",
              color: groupFilter === "all" ? "var(--point-deep)" : "var(--ink-2)",
            }}
          >
            전체 출처
          </button>
          {groupOptions.hasDirect && (
            <button
              type="button"
              onClick={() => setGroupFilter("direct")}
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
              onClick={() => setGroupFilter(id)}
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
      )}

      <div className="mt-2 flex justify-end">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="d rounded-full border px-2.5 py-1 text-xs outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          찾는 기록이 없어요.
        </p>
      )}

      {sortedFlat && sortedFlat.length > 0 && (
        <div
          className="mt-5 overflow-hidden rounded-[var(--r)] border"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {sortedFlat.map((record, index) => renderRow(record, index > 0))}
        </div>
      )}

      {grouped && (
        <div className="mt-5 flex flex-col gap-5">
          {grouped.map(([month, rows]) => (
            <div key={month}>
              <div className="flex items-center justify-between px-1">
                <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
                  {monthLabel(month)}
                </span>
                <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {rows.length}권
                </span>
              </div>
              <div
                className="mt-2 overflow-hidden rounded-[var(--r)] border"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                {rows.map((record, index) => renderRow(record, index > 0))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <RecordEditModal record={toEditable(editing)} onClose={() => setEditing(null)} />}
    </div>
  );
}
