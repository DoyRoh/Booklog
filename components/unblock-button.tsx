"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** 차단한 숲지기의 그룹 화면에서 차단을 푸는 버튼. */
export default function UnblockButton({ blockedId }: { blockedId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function unblock() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("user_blocks").delete().eq("blocked_id", blockedId);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={unblock}
      className="d mt-3 rounded-[14px] border px-4 py-2 text-sm disabled:opacity-40"
      style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
    >
      차단 풀기
    </button>
  );
}
