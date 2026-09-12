"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { OperatorAvatar } from "@/lib/active-profile";

export type OperatorGroup = {
  groupId: string;
  groupName: string;
  groupType: string;
  operatorRole: "teacher" | "admin" | "curator";
};

// 더보기의 "프로필" 중 숲지기(그룹을 운영하는 사람 -- 선생님·가족·기관·인플루언서)
// 프로필. 아이 프로필 줄과 같은 모양으로 맞췄다 -- 지금 고른 얼굴(곰·백로)과
// 이름이 한 줄에 보이고, 줄을 누르면 그 프로필로 전환, 오른쪽 "고치기"를
// 누르면 이름과 얼굴을 함께 고친다(예전엔 곰·백로 칩 두 개가 늘 펼쳐져 있어
// 화면이 복잡했다).
const AVATARS: { id: OperatorAvatar; label: string; hint: string }[] = [
  { id: "bear", label: "곰", hint: "등불로 길을 비춰 주는 숲지기" },
  { id: "egret", label: "백로", hint: "책 소식을 물어다 주는 숲지기" },
];

export default function OperatorProfileSwitcher({
  userId,
  groups,
  avatar,
  operatorName,
  isActive,
}: {
  userId: string;
  groups: OperatorGroup[];
  avatar: OperatorAvatar | null;
  operatorName: string | null;
  /** 지금 숲지기 프로필로 보고 있는지 -- 아이 줄의 "보는 중"과 같은 표시. */
  isActive: boolean;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [savedAvatar, setSavedAvatar] = useState<OperatorAvatar>(avatar ?? "bear");
  const [savedName, setSavedName] = useState(operatorName ?? "");
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(operatorName ?? "");
  const [avatarDraft, setAvatarDraft] = useState<OperatorAvatar>(avatar ?? "bear");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setNameDraft(savedName);
    setAvatarDraft(savedAvatar);
    setError(null);
    setEditing(true);
  }

  // 숲지기 이름은 계정에 하나(users.operator_name). 아이·부모가 그룹 목록에서
  // 보는 건 groups.operator_name 복사본이라 내 그룹 전부를 같이 갱신한다.
  async function save() {
    const next = nameDraft.trim();
    if (!next) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ operator_name: next, operator_avatar: avatarDraft })
      .eq("id", userId);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    // 얼굴(곰/백로)도 이름과 같이 내 그룹 전부에 복사해 둔다 -- 우리 숲의
    // 숲지기 캐릭터가 실제로 고른 얼굴로 보이려면 그룹 쪽에도 필요하다.
    await supabase.from("groups").update({ operator_name: next, operator_avatar: avatarDraft }).eq("owner_id", userId);
    setSaving(false);
    setSavedName(next);
    setSavedAvatar(avatarDraft);
    setEditing(false);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.refresh();
  }

  // 줄을 누르면 숲지기 프로필로 전환하고 대시보드로 간다. 아이 프로필로
  // 보는 중에 숲지기 화면을 열면 하단 탭이 섞여 보이므로(예전 지적),
  // 프로필을 먼저 바꾼 뒤 이동한다.
  async function selectOperator() {
    if (isActive) {
      router.push("/teacher");
      return;
    }
    if (!window.confirm(`${savedName || "숲지기"} 프로필로 전환하시겠어요?`)) return;
    setSwitching(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ active_profile_type: "operator" })
      .eq("id", userId);
    if (updateError) {
      setSwitching(false);
      setError(updateError.message);
      return;
    }
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.push("/teacher");
    router.refresh();
  }

  if (groups.length === 0) {
    return (
      <Link
        href="/recommend/create"
        className="d block rounded-[var(--r)] border border-dashed px-4 py-3 text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
      >
        + 새 그룹 만들기 (숲지기 프로필이 하나 늘어나요)
      </Link>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div
        className="rounded-[var(--r)] border"
        style={{
          borderColor: isActive ? "var(--point)" : "var(--rule)",
          background: isActive ? "rgba(47,168,79,0.08)" : "var(--card)",
        }}
      >
        {editing ? (
          <div className="flex flex-col gap-3 p-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                숲지기 이름 (아이에게 보여요)
              </span>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="예: 책읽는곰, 은빛반 선생님"
                className="min-w-0 rounded-[14px] border px-4 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              />
            </label>

            {/* 얼굴은 상단 제목 옆과 하단 프로필 탭에 뜬다 -- 세계관대로
                곰(길을 비추는 쪽)과 백로(소식을 물어다 주는 쪽) 중에서. */}
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                얼굴
              </span>
              <div className="flex items-stretch gap-2">
                {AVATARS.map((a) => {
                  const selected = avatarDraft === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAvatarDraft(a.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border px-3 py-2 text-left"
                      style={{
                        borderColor: selected ? "var(--point)" : "var(--rule)",
                        background: selected ? "rgba(47,168,79,0.08)" : "var(--card)",
                      }}
                      aria-pressed={selected}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/illustrations/face-${a.id}.png`}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 flex-none rounded-full"
                      />
                      <span className="min-w-0">
                        <span className="d block text-xs">{a.label}</span>
                        <span className="block text-[10px] leading-tight" style={{ color: "var(--ink-2)" }}>
                          {a.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs" style={{ color: "var(--berry)" }}>
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="d rounded-[14px] border px-4 py-2 text-xs"
                style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={!nameDraft.trim() || saving}
                onClick={save}
                className="d rounded-[14px] px-4 py-2 text-xs text-white disabled:opacity-40"
                style={{ background: "var(--point)" }}
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={selectOperator}
              disabled={switching}
              className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/illustrations/face-${savedAvatar}.png`}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 flex-none rounded-full"
                style={{ opacity: isActive ? 1 : 0.75 }}
              />
              <div className="min-w-0 flex-1">
                <p className="d truncate text-sm" style={{ color: savedName ? "var(--ink)" : "var(--berry)" }}>
                  {savedName || "이름을 정해 주세요"}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                  그룹 {groups.length}개
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={startEdit}
              className="d flex-none rounded-[14px] border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--rule)", color: "var(--point-deep)", background: "var(--card)" }}
            >
              고치기
            </button>
            <span className="d flex-none text-xs" style={{ color: isActive ? "var(--point-deep)" : "var(--ink-2)" }}>
              {switching ? "전환 중…" : isActive ? "보는 중" : "›"}
            </span>
          </div>
        )}
      </div>

      {error && !editing && (
        <p className="text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
