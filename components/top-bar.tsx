"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getActiveChild } from "@/lib/active-child";
import { MoreIcon } from "@/components/icons/tab-icons";

const HIDDEN_PREFIXES = ["/login", "/signup", "/onboarding"];

// 화면마다 따로 "오늘"/"책장" 같은 제목을 두는 대신, 부모 계정이면
// "{아이 이름}의 책숲"을 상단에 고정으로 띄운다 -- 지금 어느 탭인지는
// 하단 탭 강조 표시로 이미 알 수 있다. '더보기'도 같은 줄 우측에 둔다.
export default function TopBar() {
  const pathname = usePathname();
  const [title, setTitle] = useState("책숲");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "parent") return;
      const child = await getActiveChild(supabase, user.id);
      if (child) setTitle(`${child.name}의 책숲`);
    });
  }, []);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const active = pathname === "/more" || pathname.startsWith("/more/");

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 border-b"
      style={{ paddingTop: "var(--st)", background: "var(--paper)", borderColor: "var(--rule)" }}
    >
      <div className="mx-auto flex max-w-[520px] items-center justify-between px-5 py-2.5">
        <span className="d text-lg" style={{ color: "var(--ink)" }}>
          {title}
        </span>
        <Link
          href="/more"
          aria-label="더보기"
          className="flex items-center gap-1"
          style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}
        >
          <span className="d text-xs">더보기</span>
          <MoreIcon width={20} height={20} strokeWidth={active ? 2.4 : 1.9} />
        </Link>
      </div>
    </div>
  );
}
