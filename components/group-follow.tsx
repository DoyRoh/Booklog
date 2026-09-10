"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 그룹 상세(아이·부모 보기)의 팔로우/참가 버튼.
 * - 공개 그룹: 팔로우 ↔ 팔로잉(누르면 끊기)
 * - 승인제 그룹: 승인된 뒤에만 이 화면이 보이므로(RLS) "참가 중"과 나가기만.
 *   아직 참가 전이면 초대 코드 안내.
 */
export default function GroupFollow({
  groupId,
  joinPolicy,
  activeChildId,
  isMember,
}: {
  groupId: string;
  joinPolicy: string;
  activeChildId: string | null;
  isMember: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function run(action: "follow" | "leave") {
    if (!activeChildId) {
      setError("먼저 더보기에서 아이를 등록해 주세요.");
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: dbError } =
      action === "follow"
        ? await supabase.from("group_members").insert({
            group_id: groupId,
            child_id: activeChildId,
            role: "member",
            status: "approved",
          })
        : await supabase.from("group_members").delete().eq("group_id", groupId).eq("child_id", activeChildId);

    busyRef.current = false;
    setBusy(false);
    if (dbError && dbError.code !== "23505") {
      setError(dbError.message);
      return;
    }
    router.refresh();
  }

  function leave() {
    if (!window.confirm("이 그룹을 그만 따라갈까요? 남긴 기록은 책장에 그대로 있어요.")) return;
    run("leave");
  }

  const secondaryBtn = "d rounded-[14px] border px-4 py-2 text-xs disabled:opacity-40";

  return (
    <div className="flex flex-col items-end gap-1">
      {isMember ? (
        <button
          type="button"
          disabled={busy}
          onClick={leave}
          className={secondaryBtn}
          style={{ borderColor: "var(--rule)", color: "var(--point-deep)", background: "var(--card)" }}
        >
          {joinPolicy === "open" ? "팔로잉" : "참가 중"}
        </button>
      ) : joinPolicy === "open" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => run("follow")}
          className="d rounded-[14px] px-5 py-2 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          팔로우
        </button>
      ) : (
        <Link href="/recommend" className={secondaryBtn} style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>
          초대 코드로 참가
        </Link>
      )}
      {error && (
        <p className="text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
