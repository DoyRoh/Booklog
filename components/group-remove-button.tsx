"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode =
  | { kind: "leave-child"; childId: string } // 아이가 그룹에서 나가기(팔로우 끊기·탈퇴)
  | { kind: "leave-operator"; userId: string } // 운영진이 운영 그만두기(그룹은 남음)
  | { kind: "delete" }; // 그룹장이 그룹 삭제(추천도서·숙제·멤버십 함께 삭제, 독서기록은 남음)

const LABEL: Record<Mode["kind"], string> = {
  "leave-child": "나가기",
  "leave-operator": "운영 그만두기",
  delete: "그룹 삭제",
};

export default function GroupRemoveButton({
  groupId,
  groupName,
  mode,
  afterHref,
}: {
  groupId: string;
  groupName: string;
  mode: Mode;
  afterHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function run() {
    const message =
      mode.kind === "delete"
        ? `'${groupName}' 그룹을 삭제할까요?\n추천도서·숙제·그룹원 목록이 함께 지워져요. 아이들이 남긴 독서기록은 각자 책장에 그대로 남아요.`
        : mode.kind === "leave-operator"
          ? `'${groupName}' 운영을 그만둘까요? 그룹과 추천도서는 그대로 남고, 내 숲지기 목록에서만 빠져요.`
          : `'${groupName}'에서 나갈까요? 남긴 기록은 책장에 그대로 있어요.`;
    if (!window.confirm(message)) return;
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: dbError } =
      mode.kind === "delete"
        ? await supabase.from("groups").delete().eq("id", groupId)
        : mode.kind === "leave-operator"
          ? await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", mode.userId)
          : await supabase.from("group_members").delete().eq("group_id", groupId).eq("child_id", mode.childId);

    busyRef.current = false;
    setBusy(false);
    if (dbError) {
      setError(
        dbError.code === "23503"
          ? "아직 이 그룹을 가리키는 기록이 있어 지울 수 없어요. 마이그레이션 0023을 적용한 뒤 다시 시도해 주세요."
          : dbError.message
      );
      return;
    }
    if (mode.kind !== "leave-child") {
      // 운영 그룹이 바뀌었으니 상단바·하단탭의 프로필도 다시 계산한다.
      window.dispatchEvent(new Event("chaeksup:profile-changed"));
    }
    if (afterHref) router.replace(afterHref);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="d flex-none whitespace-nowrap rounded-[14px] border px-3 py-1.5 text-xs disabled:opacity-40"
        style={{
          borderColor: "var(--rule)",
          color: mode.kind === "delete" ? "var(--berry)" : "var(--ink-2)",
          background: "var(--card)",
        }}
      >
        {LABEL[mode.kind]}
      </button>
      {error && (
        <p className="max-w-[240px] text-right text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
