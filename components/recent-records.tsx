"use client";

import { useState } from "react";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";
import type { ReadingStatus } from "@/lib/reading-status";

export type RecentRecord = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  status: ReadingStatus;
  rating: number | null;
  emotion: string | null;
  favorite: boolean;
  memo: string;
  readDate: string;
};

export default function RecentRecords({ records }: { records: RecentRecord[] }) {
  const [editing, setEditing] = useState<RecentRecord | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {records.map((record) => (
        <button
          key={record.id}
          type="button"
          onClick={() => setEditing(record)}
          className="flex items-center gap-3 rounded-[var(--r)] border p-3 text-left"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {record.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.coverUrl} alt="" className="h-14 w-10 flex-none rounded object-cover" />
          ) : (
            <div
              className="flex h-14 w-10 flex-none items-center justify-center rounded"
              style={{ background: "var(--paper)" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="d truncate text-sm">{record.title}</p>
            <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
              {record.readDate}
              {record.rating ? ` · 평점 ${record.rating}` : ""}
              {record.emotion ? ` · ${record.emotion}` : ""}
            </p>
          </div>
        </button>
      ))}

      {editing && (
        <RecordEditModal
          record={
            {
              id: editing.id,
              title: editing.title,
              author: editing.author,
              coverUrl: editing.coverUrl,
              status: editing.status,
              rating: editing.rating,
              emotion: editing.emotion,
              favorite: editing.favorite,
              memo: editing.memo,
            } as EditableRecord
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
