"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import type { OperatorAvatar } from "@/lib/active-profile";

export type OperatorGroup = {
  groupId: string;
  groupName: string;
  groupType: string;
  operatorRole: "teacher" | "admin" | "curator";
};

// 더보기의 "프로필" 목록 중 숲지기(그룹을 운영하는 사람 -- 선생님·가족·기관·인플루언서) 프로필 부분.
// 계정 하나가 아이 프로필과 동시에 가질 수 있는 다른 종류의 프로필이라,
// ChildSwitcher와 나란히 놓고 쓴다. 그룹을 고르면 active_profile_type을
// "operator"로 바꾸고 숲지기 대시보드로 이동한다 -- 여러 그룹을 운영해도
// 대시보드가 전부 한 화면에 모아서 보여주므로 목적지는 하나뿐이다.
const AVATARS: { id: OperatorAvatar; label: string; hint: string }[] = [
  { id: "bear", label: "곰", hint: "등불로 길을 비춰 주는 숲지기" },
  { id: "egret", label: "백로", hint: "책 소식을 물어다 주는 숲지기" },
];

export default function OperatorProfileSwitcher({
  userId,
  groups,
  isActive,
  avatar,
}: {
  userId: string;
  groups: OperatorGroup[];
  isActive: boolean;
  avatar: OperatorAvatar | null;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<OperatorAvatar>(avatar ?? "bear");

  async function pickAvatar(next: OperatorAvatar) {
    setCurrentAvatar(next);
    const supabase = createClient();
    await supabase.from("users").update({ operator_avatar: next }).eq("id", userId);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
  }

  async function selectOperator() {
    setSwitching(true);
    const supabase = createClient();
    await supabase.from("users").update({ active_profile_type: "operator" }).eq("id", userId);
    setSwitching(false);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.push("/teacher");
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
    <div className="flex flex-col gap-3">
      {/* 운영 프로필의 얼굴 -- 상단 제목 옆에 뜬다. 아이의 아바타 선택과 같은
          역할이지만, 운영진은 세계관대로 곰(선생님 느낌)과 백로(소식 전하는
          기관·인플루언서 느낌) 중에서 고른다. 강제는 아니고 취향대로. */}
      <div className="flex items-center gap-3">
        {AVATARS.map((a) => {
          const selected = currentAvatar === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pickAvatar(a.id)}
              className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-left"
              style={{
                borderColor: selected ? "var(--point)" : "var(--rule)",
                background: selected ? "rgba(47,168,79,0.08)" : "var(--card)",
              }}
              aria-pressed={selected}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/illustrations/face-${a.id}.png`} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
              <span className="flex flex-col leading-tight">
                <span className="d text-xs">{a.label}</span>
                <span className="text-[10px]" style={{ color: "var(--ink-2)" }}>
                  {a.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {groups.map((group) => {
        const active = isActive;
        return (
          <button
            key={group.groupId}
            type="button"
            onClick={() => selectOperator()}
            disabled={switching}
            className="flex items-center gap-3 rounded-[var(--r)] border px-4 py-3 text-left disabled:opacity-60"
            style={{
              borderColor: active ? "var(--point)" : "var(--rule)",
              background: active ? "rgba(47,168,79,0.08)" : "var(--card)",
            }}
          >
            <div className="flex-1">
              <p className="d text-sm">숲지기 · {group.groupName}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {GROUP_TYPE_LABELS[group.groupType] ?? group.groupType}
              </p>
            </div>
            {active && (
              <span className="d text-xs" style={{ color: "var(--point-deep)" }}>
                선택됨
              </span>
            )}
          </button>
        );
      })}

      <Link
        href="/recommend/create"
        className="d rounded-[var(--r)] border border-dashed px-4 py-3 text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
      >
        + 새 그룹 만들기
      </Link>
    </div>
  );
}
