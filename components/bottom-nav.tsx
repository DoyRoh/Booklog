"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-context";
import {
  TodayIcon,
  LibraryIcon,
  RecordsIcon,
  RecommendIcon,
  BadgeIcon,
  DashboardIcon,
  AssignmentIcon,
  ChildrenIcon,
} from "@/components/icons/tab-icons";

// '더보기'는 하단 탭이 아니라 상단 우측 상시 아이콘(TopBar)으로 옮겼다 --
// 부모/교사/큐레이터 탭 어디에도 더 이상 포함하지 않는다.
const PARENT_TABS = [
  { href: "/today", label: "오늘", Icon: TodayIcon },
  { href: "/library", label: "책장", Icon: LibraryIcon },
  { href: "/records", label: "기록", Icon: RecordsIcon },
  { href: "/recommend", label: "추천", Icon: RecommendIcon },
  { href: "/badges", label: "배지", Icon: BadgeIcon },
] as const;

const TEACHER_TABS = [
  { href: "/teacher", label: "대시보드", Icon: DashboardIcon },
  { href: "/teacher/children", label: "아이 관리", Icon: ChildrenIcon },
  { href: "/teacher/assignments", label: "숙제", Icon: AssignmentIcon },
  { href: "/recommend", label: "그룹", Icon: RecommendIcon },
] as const;

const CURATOR_TABS = [
  { href: "/curator", label: "대시보드", Icon: DashboardIcon },
  { href: "/recommend", label: "그룹", Icon: RecommendIcon },
] as const;

const HIDDEN_PREFIXES = ["/login", "/signup", "/onboarding"];

export default function BottomNav() {
  const pathname = usePathname();
  const { role } = useProfile();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  // 역할 조회가 끝나기 전(role===null)에는 부모 탭을 기본값으로 보여준다 --
  // 로그인 직후 탭이 매번 깜빡이지 않도록.
  const tabs = role === "teacher" ? TEACHER_TABS : role === "curator" ? CURATOR_TABS : PARENT_TABS;

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
