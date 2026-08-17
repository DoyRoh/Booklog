"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TodayIcon,
  LibraryIcon,
  RecordsIcon,
  RecommendIcon,
  MoreIcon,
} from "@/components/icons/tab-icons";

const TABS = [
  { href: "/today", label: "오늘", Icon: TodayIcon },
  { href: "/library", label: "책장", Icon: LibraryIcon },
  { href: "/records", label: "기록", Icon: RecordsIcon },
  { href: "/recommend", label: "추천", Icon: RecommendIcon },
  { href: "/more", label: "더보기", Icon: MoreIcon },
] as const;

const HIDDEN_PREFIXES = ["/login", "/signup", "/onboarding"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[520px] items-stretch justify-between border-t px-2"
      style={{
        background: "var(--card)",
        borderColor: "var(--rule)",
        paddingBottom: "var(--sb)",
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2"
            style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}
          >
            <Icon strokeWidth={active ? 2.4 : 1.9} />
            <span
              className="d relative text-[11px]"
              style={{ fontFamily: "var(--disp)" }}
            >
              {label}
              {active && (
                <span
                  className="absolute -bottom-1 left-[-3px] right-[-3px] h-[3px] rounded-full"
                  style={{ background: "var(--point)" }}
                />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
