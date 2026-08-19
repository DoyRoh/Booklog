"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  TodayIcon,
  LibraryIcon,
  RecordsIcon,
  RecommendIcon,
  MoreIcon,
  DashboardIcon,
  AssignmentIcon,
  ChildrenIcon,
} from "@/components/icons/tab-icons";

const PARENT_TABS = [
  { href: "/today", label: "오늘", Icon: TodayIcon },
  { href: "/library", label: "책장", Icon: LibraryIcon },
  { href: "/records", label: "기록", Icon: RecordsIcon },
  { href: "/recommend", label: "추천", Icon: RecommendIcon },
  { href: "/more", label: "더보기", Icon: MoreIcon },
] as const;

const TEACHER_TABS = [
  { href: "/teacher", label: "대시보드", Icon: DashboardIcon },
  { href: "/teacher/children", label: "아이 관리", Icon: ChildrenIcon },
  { href: "/teacher/assignments", label: "숙제", Icon: AssignmentIcon },
  { href: "/recommend", label: "그룹", Icon: RecommendIcon },
  { href: "/more", label: "더보기", Icon: MoreIcon },
] as const;

const CURATOR_TABS = [
  { href: "/curator", label: "대시보드", Icon: DashboardIcon },
  { href: "/recommend", label: "그룹", Icon: RecommendIcon },
  { href: "/more", label: "더보기", Icon: MoreIcon },
] as const;

const HIDDEN_PREFIXES = ["/login", "/signup", "/onboarding"];

export default function BottomNav() {
  const pathname = usePathname();
  const [tabs, setTabs] = useState<
    readonly { href: string; label: string; Icon: typeof TodayIcon }[]
  >(PARENT_TABS);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      // 로그인 직후 기본값(부모 탭)에서 시작해, 역할을 확인한 뒤에만
      // 필요하면 바꾼다 -- 탭이 매번 깜빡이지 않도록.
      if (profile?.role === "teacher") {
        setTabs(TEACHER_TABS);
      } else if (profile?.role === "curator") {
        setTabs(CURATOR_TABS);
      }
    });
  }, []);

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
      {tabs.map(({ href, label, Icon }) => {
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
