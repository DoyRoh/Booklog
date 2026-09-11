"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-context";
import { isChromeHidden } from "@/lib/nav";
import {
  TodayIcon,
  LibraryIcon,
  AddIcon,
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
// '추가'는 책장 바로 다음에 둔 빠른 진입점 -- 기록 남기기(/library/add)로
// 바로 가서 책을 찾아 넣으면 그 즉시 책장에 꽂힌다(사용자 요청: "책장에
// 책 꽂는 메뉴도 하나 추가하자").
// "추가"만 초록 포인트 대신 연두(--sprout)로 눈에 띄게 한다(사용자 요청:
// "다른 색상으로 지정해줘 연두색이나 여튼 어울리는 색으로").
const PARENT_TABS = [
  { href: "/today", label: "오늘", Icon: TodayIcon },
  { href: "/library", label: "책장", Icon: LibraryIcon },
  { href: "/library/add", label: "추가", Icon: AddIcon, accent: "sprout" },
  { href: "/trail", label: "숲길", Icon: RecommendIcon },
  { href: "/assignments", label: "숙제", Icon: AssignmentIcon },
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

// 스레드(Threads) 앱처럼 화면 아래에 떠 있는 둥근 알약 모양 바. 아래로
// 스크롤하면(내용을 읽는 중) 스르륵 내려가 숨고, 위로 조금만 올리면
// 다시 올라온다 -- "필요한 걸 알았다는 듯이". 맨 위·맨 아래 근처에서는
// 항상 보인다. 움직임 최소화 설정이면 전환 없이 바로 나타나고 사라진다.
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const acc = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const delta = y - lastY.current;
        lastY.current = y;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        // 맨 위·맨 아래(바운스 포함) 근처에서는 항상 보인다.
        if (y < 24 || y > max - 24) {
          acc.current = 0;
          setHidden(false);
          return;
        }
        // 같은 방향으로 누적된 이동량이 문턱을 넘을 때만 바꾼다 -- 손가락
        // 떨림이나 아주 작은 스크롤에 깜빡이지 않도록.
        acc.current = Math.sign(delta) === Math.sign(acc.current) ? acc.current + delta : delta;
        if (acc.current > 28) setHidden(true);
        else if (acc.current < -12) setHidden(false);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { role, loading } = useProfile();
  const hidden = useHideOnScroll();

  if (isChromeHidden(pathname) || (!loading && role === null)) {
    return null;
  }

  // 역할 조회가 끝나기 전(role===null)에는 부모 탭을 기본값으로 보여준다 --
  // 로그인 직후 탭이 매번 깜빡이지 않도록.
  const tabs = role === "operator" ? OPERATOR_TABS : PARENT_TABS;

  // 숲지기 탭은 /teacher 아래에 전부 있어서 단순 startsWith로는 "대시보드"
  // (/teacher)가 어느 화면에서나 켜져 보였다. 경로가 맞는 탭 중 가장 긴
  // 것 하나만 켠다.
  const activeHref = tabs
    .map((t) => t.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      aria-label="주 메뉴"
      className="no-print fixed inset-x-0 z-50 mx-auto flex w-fit max-w-[calc(100%-32px)] items-center gap-[2px] rounded-full p-[6px] transition-transform duration-300 ease-out motion-reduce:transition-none"
      style={{
        bottom: "calc(var(--sb) + 14px)",
        background: "rgba(255,255,255,0.96)",
        willChange: "transform",
        boxShadow: "0 8px 28px -10px rgba(38,54,43,0.35), 0 0 0 1px rgba(38,54,43,0.06)",
        transform: hidden ? "translateY(calc(100% + var(--sb) + 20px))" : "translateY(0)",
      }}
    >
      {tabs.map((tab) => {
        const { href, label, Icon } = tab;
        const active = href === activeHref;
        const isSprout = "accent" in tab && tab.accent === "sprout";
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className="flex h-[48px] items-center gap-[6px] rounded-full px-[12px] transition-colors"
            style={{
              color: isSprout ? "var(--sprout-deep)" : active ? "var(--point-deep)" : "var(--ink-2)",
              // "추가"는 다른 탭과 달리 항상 연두 알약으로 눈에 띄어야 한다
              // (사용자 요청) -- 눌러서 그 화면에 있을 때만 더 진해진다.
              background: isSprout
                ? active
                  ? "rgba(139,195,74,0.42)"
                  : "rgba(139,195,74,0.22)"
                : active
                  ? "rgba(47,168,79,0.14)"
                  : "transparent",
            }}
          >
            <span className="flex h-[24px] w-[24px] items-center justify-center">
              <Icon strokeWidth={active ? 2.4 : 1.9} />
            </span>
            {/* 켜진 탭만 이름을 옆에 펼친다 -- 아이콘만으로도 어디인지 읽히게.
                "추가"는 항상 CTA로 보여야 하니 이름도 항상 펼쳐 둔다. */}
            {(active || isSprout) && (
              <span className="d whitespace-nowrap text-[13px] leading-none" style={{ fontFamily: "var(--disp)" }}>
                {label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
