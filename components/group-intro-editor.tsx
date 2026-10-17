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
  initialPolicy,
}: {
  groupId: string;
  initialName: string;
  initialType: string;
  initial: string | null;
  initialPolicy: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);
  const [text, setText] = useState(initial ?? "");
  const [policy, setPolicy] = useState(initialPolicy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(initialName);
    setType(initialType);
    setText(initial ?? "");
    setPolicy(initialPolicy);
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
      .update({ name: name.trim(), type, description: text.trim() || null, join_policy: policy })
      .eq("id", groupId);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    // 승인제 → 공개로 바꾸면 승인을 기다리던 신청은 더 기다릴 이유가 없어 함께 승인한다.
    if (initialPolicy === "approval" && policy === "open") {
      await supabase
        .from("group_members")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("group_id", groupId)
        .eq("status", "pending");
    }
    setSaving(false);
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

      <div className="flex flex-col gap-1.5">
        <span className="d text-sm">가입 방식</span>
        <div className="flex gap-2">
          {(
            [
              ["open", "공개", "누구나 바로 팔로우"],
              ["approval", "승인제", "신청하면 내가 승인"],
            ] as const
          ).map(([value, label, hint]) => {
            const selected = policy === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPolicy(value)}
                aria-pressed={selected}
                className="flex-1 rounded-[14px] border px-3 py-2 text-left"
                style={{
                  borderColor: selected ? "var(--point)" : "var(--rule)",
                  background: selected ? "rgba(47,168,79,0.08)" : "var(--card)",
                }}
              >
                <span className="d block text-sm" style={{ color: selected ? "var(--point-deep)" : "var(--ink)" }}>{label}</span>
                <span className="block text-xs" style={{ color: "var(--ink-2)" }}>{hint}</span>
              </button>
            );
          })}
        </div>
        {policy !== initialPolicy && (
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            {policy === "open"
              ? "공개로 바꾸면 기다리던 신청이 모두 승인되고, 둘러보기에 노출돼요."
              : "승인제로 바꾸면 새로 들어오는 사람은 승인을 받아야 하고, 둘러보기에서는 숨겨져요. 이미 들어온 아이는 그대로예요."}
          </p>
        )}
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
