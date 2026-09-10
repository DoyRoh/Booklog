"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarIllustration } from "@/components/illustration";

type Avatar = "rabbit" | "dog" | "cat";
type Child = {
  id: string;
  name: string;
  avatar: Avatar | null;
  birth_date: string | null;
};


const AVATAR_OPTIONS: { value: Avatar; label: string }[] = [
  { value: "rabbit", label: "토끼" },
  { value: "dog", label: "강아지" },
  { value: "cat", label: "고양이" },
];

export default function ChildSwitcher({
  userId,
  childList: initialChildren,
  activeChildId,
}: {
  userId: string;
  childList: Child[];
  activeChildId: string | null;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectChild(childId: string) {
    if (childId === activeChildId) return;
    setSwitching(childId);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ active_child_id: childId, active_profile_type: "child" })
      .eq("id", userId);

    setSwitching(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // 상단 "OO의 책숲" 제목은 router.refresh()로는 안 바뀐다(서버 컴포넌트만
    // 다시 그리고, 이 제목은 클라이언트에서 따로 들고 있는 상태라서) --
    // 전역으로 이벤트를 쏴서 즉시 다시 불러오게 한다.
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.refresh();
  }

  async function addChild() {
    if (!name.trim() || !avatar) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const childId = crypto.randomUUID();

    const { error: childError } = await supabase.from("children").insert({
      id: childId,
      name: name.trim(),
      birth_date: birthDate || null,
      avatar,
    });
    if (childError) {
      setError(childError.message);
      setSaving(false);
      return;
    }

    const { error: guardianError } = await supabase.from("child_guardians").insert({
      child_id: childId,
      user_id: userId,
      role: "owner",
    });
    if (guardianError) {
      setError(guardianError.message);
      setSaving(false);
      return;
    }

    // 새로 추가한 아이로 바로 전환.
    const { error: activeError } = await supabase
      .from("users")
      .update({ active_child_id: childId, active_profile_type: "child" })
      .eq("id", userId);
    if (activeError) {
      setError(activeError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setAdding(false);
    setName("");
    setBirthDate("");
    setAvatar(null);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {initialChildren.map((child) => {
        const active = child.id === activeChildId;
        return (
          <button
            key={child.id}
            type="button"
            onClick={() => selectChild(child.id)}
            disabled={switching === child.id}
            className="flex items-center gap-3 rounded-[var(--r)] border px-4 py-3 text-left disabled:opacity-60"
            style={{
              borderColor: active ? "var(--point)" : "var(--rule)",
              background: active ? "rgba(47,168,79,0.08)" : "var(--card)",
            }}
          >
            <AvatarIllustration avatar={child.avatar} height={44} style={{ opacity: active ? 1 : 0.6 }} />
            <div className="flex-1">
              <p className="d text-sm">{child.name}</p>
              {child.birth_date && (
                <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {child.birth_date}
                </p>
              )}
            </div>
            {active && (
              <span className="d text-xs" style={{ color: "var(--point-deep)" }}>
                선택됨
              </span>
            )}
          </button>
        );
      })}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="d rounded-[var(--r)] border border-dashed px-4 py-3 text-sm"
          style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
        >
          + 아이 추가
        </button>
      )}

      {adding && (
        <div
          className="flex flex-col gap-3 rounded-[var(--r)] border p-4"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="d text-xs" style={{ color: "var(--ink-2)" }}>아이 이름</span>
            <input
              type="text"
              placeholder="예: 유안"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[14px] border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--rule)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
              생년월일 <span style={{ opacity: 0.6 }}>(선택)</span>
            </span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="rounded-[14px] border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--rule)" }}
            />
          </label>
          <div className="flex justify-between gap-3">
            {AVATAR_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAvatar(value)}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-[var(--r)] border py-3"
                style={{
                  borderColor: avatar === value ? "var(--point)" : "var(--rule)",
                  background: avatar === value ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: avatar === value ? "var(--point-deep)" : "var(--ink)",
                }}
              >
                <AvatarIllustration avatar={value} height={56} />
                <span className="d text-xs">{label}</span>
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="d flex-1 rounded-[14px] border py-3 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!name.trim() || !avatar || saving}
              onClick={addChild}
              className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              {saving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {error && !adding && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
