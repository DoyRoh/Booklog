"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** 숲지기가 그룹 소개글을 적고 고치는 자리. 아이·부모는 팔로우 전에 이 글을 본다. */
export default function GroupIntroEditor({ groupId, initial }: { groupId: string; initial: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("groups")
      .update({ description: text.trim() || null })
      .eq("id", groupId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 whitespace-pre-line text-sm" style={{ color: initial ? "var(--ink)" : "var(--ink-2)" }}>
          {initial || "아직 소개글이 없어요. 어떤 책을 고르는 그룹인지 한두 줄 적어 두면 팔로우하기 전에 읽어 봐요."}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="d flex-none rounded-[14px] border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--rule)", color: "var(--point-deep)", background: "var(--card)" }}
        >
          {initial ? "고치기" : "소개 쓰기"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="예: 7살 아이들이 좋아한 그림책을 매주 골라 올려요."
        className="rounded-[14px] border px-4 py-3 text-sm outline-none"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setText(initial ?? "");
            setEditing(false);
          }}
          className="d rounded-[14px] border px-4 py-2 text-xs"
          style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
        >
          취소
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="d rounded-[14px] px-4 py-2 text-xs text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          저장
        </button>
      </div>
    </div>
  );
}
