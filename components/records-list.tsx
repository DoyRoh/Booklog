"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons/misc-icons";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";
import type { ReadingStatus } from "@/lib/reading-status";

export type RecordRow = {
  id: string;
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

const STATUS_BADGE_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶어요",
  reading: "읽는 중",
  done: "다 읽음",
};

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function RecordsList({ childName, records }: { childName: string; records: RecordRow[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RecordRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.bookTitle.toLowerCase().includes(q) || (r.bookAuthor ?? "").toLowerCase().includes(q)
    );
  }, [records, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, RecordRow[]>();
    for (const r of filtered) {
      const key = r.readDate.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

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

  return (
    <div className="mt-6">
      <div
        className="flex items-center justify-between rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <span className="d text-sm">{childName} 독서기록</span>
        <span className="text-xs" style={{ color: "var(--ink-2)" }}>
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

      {grouped.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          찾는 기록이 없어요.
        </p>
      )}

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
              {rows.map((record, index) => (
                <div
                  key={record.id}
                  className="p-4"
                  style={index > 0 ? { borderTop: "1px solid var(--rule)" } : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setEditing(record)}
                    className="flex w-full gap-3 text-left"
                  >
                    {record.bookCoverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={record.bookCoverUrl}
                        alt=""
                        className="h-20 w-14 flex-none rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="d truncate text-sm">{record.bookTitle}</p>
                        {record.favorite && (
                          <span className="flex-none text-xs" style={{ color: "var(--berry)" }}>
                            즐겨찾는 책
                          </span>
                        )}
                      </div>
                      {record.bookAuthor && (
                        <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                          {record.bookAuthor}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                        <span>{record.readDate}</span>
                        {record.rating && <span>· 평점 {record.rating}</span>}
                        {record.emotion && <span>· {record.emotion}</span>}
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
                    <img
                      src={record.photoSignedUrl}
                      alt=""
                      className="mt-2 h-24 w-full rounded-[10px] object-cover"
                    />
                  )}
                  {record.voiceSignedUrl && (
                    <audio src={record.voiceSignedUrl} controls className="mt-2 h-9 w-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && <RecordEditModal record={toEditable(editing)} onClose={() => setEditing(null)} />}
    </div>
  );
}
