"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * "지금 아이 프로필로 보는 중인데 숲지기 화면에 들어왔다"는 상황에서
 * 한 번에 숲지기 프로필로 바꿔 주는 버튼. 프로필을 안 바꾼 채 숲지기
 * 화면만 열면 하단 탭은 아이 탭(오늘·책장·추가·그룹) 그대로라
 * 뒤죽박죽으로 보인다(사용자 지적).
 */
export default function SwitchToOperator({ userId, to = "/teacher" }: { userId: string; to?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("users").update({ active_profile_type: "operator" }).eq("id", userId);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.replace(to);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="d mt-4 w-full rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
      style={{ background: "var(--point)" }}
    >
      {busy ? "전환 중…" : "숲지기 프로필로 전환하기"}
    </button>
  );
}
