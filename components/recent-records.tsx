"use client";

import { useState } from "react";
import RecordEditModal from "@/components/record-edit-modal";
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
  pagesRead: number | null;
  shelfTagId: string | null;
  photoPath: string | null;
  voicePath: string | null;
};

export default function RecentRecords({
  childId,
  childName,
  records,
}: {
  childId: string;
  childName: string | null;
  records: RecentRecord[];
}) {
  const [editing, setEditing] = useState<RecentRecord | null>(null);

  return (
    <div>
      {records.map((record, index) => (
        <div key={record.id}>
          {index > 0 && <div className="mx-4" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />}
          <button
            type="button"
            onClick={() => setEditing(record)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
          >
            {record.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={record.coverUrl} alt="" className="h-11 w-8 flex-none rounded object-cover" />
            ) : (
              <div
                className="flex h-11 w-8 flex-none items-center justify-center rounded"
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
        </div>
      ))}

      {editing && (
        <RecordEditModal
          record={{
            id: editing.id,
            childId,
            childName,
            title: editing.title,
            author: editing.author,
            coverUrl: editing.coverUrl,
            status: editing.status,
            rating: editing.rating,
            emotion: editing.emotion,
            favorite: editing.favorite,
            memo: editing.memo,
            readDate: editing.readDate,
            pagesRead: editing.pagesRead,
            shelfTagId: editing.shelfTagId,
            photoPath: editing.photoPath,
            voicePath: editing.voicePath,
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
