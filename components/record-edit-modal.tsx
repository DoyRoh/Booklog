"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ReadingStatus } from "@/lib/reading-status";

const EMOTIONS = ["재밌어요", "웃겼어요", "감동적이에요", "슬퍼요", "그저그래요"];
const RATINGS = [1, 2, 3, 4, 5];
const STATUS_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶어요",
  reading: "읽는 중이에요",
  done: "다 읽었어요",
};

export type EditableRecord = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  status: ReadingStatus;
  rating: number | null;
  emotion: string | null;
  favorite: boolean;
  memo: string;
};

export default function RecordEditModal({
  record,
  onClose,
}: {
  record: EditableRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReadingStatus>(record.status);
  const [rating, setRating] = useState(record.rating);
  const [emotion, setEmotion] = useState(record.emotion);
  const [favorite, setFavorite] = useState(record.favorite);
  const [memo, setMemo] = useState(record.memo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("reading_records")
      .update({
        status,
        rating,
        emotion,
        favorite,
        parent_memo: memo || null,
      })
      .eq("id", record.id);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(38,54,43,0.45)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] p-5 pb-8 sm:rounded-[24px]"
        style={{ background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="d text-lg">기록 수정</p>
          <button type="button" onClick={onClose} className="text-sm" style={{ color: "var(--ink-2)" }}>
            닫기
          </button>
        </div>

        <div
          className="mt-3 flex gap-3 rounded-[var(--r)] border p-3"
          style={{ borderColor: "var(--rule)" }}
        >
          {record.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.coverUrl} alt="" className="h-20 w-14 rounded object-cover" />
          )}
          <div>
            <p className="d text-sm">{record.title}</p>
            {record.author && (
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {record.author}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="d text-sm">지금 상태</p>
          <div className="mt-2 flex gap-2">
            {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className="d flex-1 rounded-[14px] border py-2.5 text-sm"
                style={{
                  borderColor: status === value ? "var(--point)" : "var(--rule)",
                  background: status === value ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: status === value ? "var(--point-deep)" : "var(--ink)",
                }}
              >
                {STATUS_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {status === "done" && (
          <>
            <div className="mt-4">
              <p className="d text-sm">평점</p>
              <div className="mt-2 flex gap-2">
                {RATINGS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value === rating ? null : value)}
                    className="d flex h-10 w-10 items-center justify-center rounded-full border text-sm"
                    style={{
                      borderColor: rating === value ? "var(--point)" : "var(--rule)",
                      background: rating === value ? "var(--point)" : "var(--card)",
                      color: rating === value ? "#fff" : "var(--ink)",
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="d text-sm">기분</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMOTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEmotion(value === emotion ? null : value)}
                    className="d rounded-full border px-3 py-1.5 text-sm"
                    style={{
                      borderColor: emotion === value ? "var(--point)" : "var(--rule)",
                      background: emotion === value ? "rgba(47,168,79,0.08)" : "var(--card)",
                      color: emotion === value ? "var(--point-deep)" : "var(--ink)",
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <label
              className="mt-4 flex items-center gap-3 rounded-[var(--r)] border px-4 py-3"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
              />
              <span className="text-sm">가장 좋아하는 책으로 남기기</span>
            </label>
          </>
        )}

        <textarea
          placeholder="부모 메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="mt-4 w-full rounded-[14px] border px-4 py-3 text-sm outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />

        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--berry)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="d mt-4 w-full rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
