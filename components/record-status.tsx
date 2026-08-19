"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ReadingStatus = "want" | "reading" | "done";

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶어요",
  reading: "읽는 중",
  done: "다 읽음",
};

export default function RecordStatus({
  recordId,
  status,
}: {
  recordId: string;
  status: ReadingStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  async function update(next: ReadingStatus) {
    if (next === current || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("reading_records")
      .update({ status: next })
      .eq("id", recordId);
    if (!error) setCurrent(next);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((value) => (
        <button
          key={value}
          type="button"
          disabled={saving}
          onClick={() => update(value)}
          className="d rounded-full border px-2.5 py-1 text-xs disabled:opacity-50"
          style={{
            borderColor: current === value ? "var(--point)" : "var(--rule)",
            background: current === value ? "rgba(47,168,79,0.08)" : "transparent",
            color: current === value ? "var(--point-deep)" : "var(--ink-2)",
          }}
        >
          {STATUS_LABELS[value]}
        </button>
      ))}
    </div>
  );
}
