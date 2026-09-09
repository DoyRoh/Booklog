"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-context";
import { isChromeHidden } from "@/lib/nav";
import {
  TodayIcon,
  LibraryIcon,
  RecordsIcon,
  RecommendIcon,
  DashboardIcon,
  AssignmentIcon,
  ChildrenIcon,
} from "@/components/icons/tab-icons";

// '더보기'와 '배지'는 하단 탭이 아니라 상단 우측 상시 아이콘(TopBar)으로
// 옮겼다 -- 부모/교사/큐레이터 탭 어디에도 더 이상 포함하지 않는다.
// '추천'과 '숙제'가 그룹 상세 화면에서 겹쳐 보인다는 피드백으로 하나의
// 탭('숲길')으로 합쳤다 -- 그룹을 고르면 그 그룹의 추천도서와 숙제를 한
// 화면에서 같이 본다(app/assignments). 아직 안 속한 그룹을 찾아
// 팔로우/가입하는 기능은 더보기 화면으로 옮겼다.
const PARENT_TABS = [
  { href: "/today", label: "오늘", Icon: TodayIcon },
  { href: "/library", label: "책장", Icon: LibraryIcon },
  { href: "/records", label: "기록", Icon: RecordsIcon },
  { href: "/assignments", label: "숲길", Icon: AssignmentIcon },
] as const;

// 숲지기(선생님·기관·인플루언서 통칭) 탭. 예전엔 교사/큐레이터 탭이
// 따로였지만 하는 일이 같아서 하나로 합쳤다. 같은 데이터를 세 축으로
// 정리해서 보여준다 -- 아이별(아이들) / 책별(추천도서) / 숙제별(숙제).
// 그룹 관리(책 추가·숙제 만들기·승인·초대 코드)는 대시보드의 "관리하기"와
// 각 탭의 "+ 추가" 링크로 그룹 상세(/recommend/[groupId])에 들어가서 한다.
const OPERATOR_TABS = [
  { href: "/teacher", label: "대시보드", Icon: DashboardIcon },
  { href: "/teacher/children", label: "아이들", Icon: ChildrenIcon },
  { href: "/teacher/books", label: "추천도서", Icon: RecommendIcon },
  { href: "/teacher/assignments", label: "숙제", Icon: AssignmentIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { role, loading } = useProfile();

  if (isChromeHidden(pathname) || (!loading && role === null)) {
    return null;
  }

  // 역할 조회가 끝나기 전(role===null)에는 부모 탭을 기본값으로 보여준다 --
  // 로그인 직후 탭이 매번 깜빡이지 않도록.
  const tabs = role === "operator" ? OPERATOR_TABS : PARENT_TABS;

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[520px] items-stretch justify-between border-t px-2"
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
