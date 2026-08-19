"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreIcon } from "@/components/icons/tab-icons";

const HIDDEN_PREFIXES = ["/login", "/signup", "/onboarding"];

// '더보기'는 5탭 중 하나가 아니라, 어느 화면에서든 접근 가능한 상시
// 메뉴로 둔다 -- 화면 우측 상단에 고정된 아이콘 하나만 놓는다.
export default function TopBar() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const active = pathname === "/more" || pathname.startsWith("/more/");

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-[520px] justify-end px-4"
      style={{ paddingTop: "var(--st)" }}
    >
      <Link
        href="/more"
        aria-label="더보기"
        className="flex items-center gap-1 py-2.5 pl-3"
        style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}
      >
        <span className="d text-xs">더보기</span>
        <MoreIcon width={20} height={20} strokeWidth={active ? 2.4 : 1.9} />
      </Link>
    </div>
  );
}
