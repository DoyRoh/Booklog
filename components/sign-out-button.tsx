"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // proxy.ts가 온보딩 완료 여부를 매번 DB에 안 물어보려고 캐싱해두는
    // 쿠키 -- 다른 계정으로 새로 로그인할 수 있으니 로그아웃 시 지운다.
    document.cookie = "chaeksup_onboarded=; Max-Age=0; path=/";
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      className="d rounded-[14px] px-4 py-2 text-sm text-white"
      style={{ background: "var(--berry)" }}
    >
      로그아웃
    </button>
  );
}
