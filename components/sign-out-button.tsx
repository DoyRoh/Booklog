"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      className="d rounded-[14px] px-4 py-2 text-sm text-white"
      style={{ background: "var(--red)" }}
    >
      로그아웃
    </button>
  );
}
