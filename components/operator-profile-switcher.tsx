"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";

export type OperatorGroup = {
  groupId: string;
  groupName: string;
  groupType: string;
  operatorRole: "teacher" | "admin" | "curator";
};

// 더보기의 "프로필" 목록 중 선생님/기관 프로필 부분. 계정 하나가 아이
// 프로필과 동시에 가질 수 있는 다른 종류의 프로필이라, ChildSwitcher와
// 나란히 놓고 쓴다. 그룹을 고르면 active_profile_type을 "operator"로
// 바꾸고 그 그룹의 역할에 맞는 대시보드로 이동한다 -- 여러 그룹을
// 운영해도 대시보드 자체는 이미 전부 한 화면에 모아서 보여주므로
// (app/teacher, app/curator), 어느 그룹을 눌렀든 목적지는 역할별로
// 하나뿐이다.
export default function OperatorProfileSwitcher({
  userId,
  groups,
  isActive,
}: {
  userId: string;
  groups: OperatorGroup[];
  isActive: boolean;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function selectOperator(destination: "/teacher" | "/curator") {
    setSwitching(true);
    const supabase = createClient();
    await supabase.from("users").update({ active_profile_type: "operator" }).eq("id", userId);
    setSwitching(false);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.push(destination);
  }

  if (groups.length === 0) {
    return (
      <Link
        href="/recommend/create"
        className="d block rounded-[var(--r)] border border-dashed px-4 py-3 text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
      >
        + 선생님/기관 프로필 추가
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const active = isActive;
        const label = group.operatorRole === "curator" ? "기관" : "선생님";
        const destination = group.operatorRole === "curator" ? "/curator" : "/teacher";
        return (
          <button
            key={group.groupId}
            type="button"
            onClick={() => selectOperator(destination)}
            disabled={switching}
            className="flex items-center gap-3 rounded-[var(--r)] border px-4 py-3 text-left disabled:opacity-60"
            style={{
              borderColor: active ? "var(--point)" : "var(--rule)",
              background: active ? "rgba(47,168,79,0.08)" : "var(--card)",
            }}
          >
            <div className="flex-1">
              <p className="d text-sm">
                {label} 프로필 · {group.groupName}
              </p>
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
        + 선생님/기관 프로필 추가
      </Link>
    </div>
  );
}
