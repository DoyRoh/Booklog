"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";

type GroupType = "kindergarten" | "school" | "library" | "family" | "community" | "creator";
const TYPES = Object.keys(GROUP_TYPE_LABELS) as GroupType[];

/**
 * 숲지기가 그룹 이름·유형·소개글을 고치는 자리(그룹 상세의 숲지기 보기).
 * 접힌 상태에선 소개글(없으면 안내)만 보이고 "그룹 고치기"를 누르면
 * 세 칸이 한 폼으로 펼쳐진다. 기존 "owners update own groups" 정책으로
 * UPDATE가 허용된다.
 */
export default function GroupIntroEditor({
  groupId,
  initialName,
  initialType,
  initial,
}: {
  groupId: string;
  initialName: string;
  initialType: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);
  const [text, setText] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(initialName);
    setType(initialType);
    setText(initial ?? "");
    setEditing(false);
    setError(null);
  }

  async function save() {
    if (saving || !name.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("groups")
      .update({ name: name.trim(), type, description: text.trim() || null })
      .eq("id", groupId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditing(false);
    // 상단바·숲지기 프로필 목록의 그룹 이름도 다시 읽게 한다.
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.refresh();
  }

  const field = "rounded-[14px] border px-4 py-2.5 text-sm outline-none";
  const fieldStyle = { borderColor: "var(--rule)", background: "var(--card)" } as const;

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
          그룹 고치기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--r)] border p-4" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
      <label className="flex flex-col gap-1.5">
        <span className="d text-sm">그룹 이름</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} style={fieldStyle} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="d text-sm">유형</span>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const selected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="rounded-full border px-3 py-1.5 text-xs"
                style={{
                  borderColor: selected ? "var(--point)" : "var(--rule)",
                  background: selected ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: selected ? "var(--point-deep)" : "var(--ink)",
                }}
                aria-pressed={selected}
              >
                {GROUP_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="d text-sm">소개 (선택)</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="예: 7살 아이들이 좋아한 그림책을 매주 골라 올려요."
          className={field}
          style={fieldStyle}
        />
      </label>

      {error && (
        <p className="text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          className="d rounded-[14px] border px-4 py-2 text-xs"
          style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
        >
          취소
        </button>
        <button
          type="button"
          disabled={saving || !name.trim()}
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
