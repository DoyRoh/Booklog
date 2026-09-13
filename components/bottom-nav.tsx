"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-context";
import { isChromeHidden } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { getHomeworkBadge, type HomeworkBadge } from "@/lib/homework-badge";
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
// '숲길'(추천도서)과 '숙제'는 둘 다 "그룹을 고르고 그 안의 내용을 본다"는
// 같은 구조인데 하단 탭에 따로 있으면서 각자 그룹을 다시 골라야 해서
// "여기저기서 그룹전환하느라 정신없다"는 지적을 받았다 -- 하나의
// '그룹' 탭(app/group)으로 합치고, 그 안에서 추천도서/숙제 소제목 탭으로
// 나눴다. 아직 안 속한 그룹을 찾아 팔로우/가입하는 기능은 더보기 화면으로.
// '추가'는 책장 바로 다음에 둔 빠른 진입점 -- 기록 남기기(/library/add)로
// 바로 가서 책을 찾아 넣으면 그 즉시 책장에 꽂힌다(사용자 요청: "책장에
// 책 꽂는 메뉴도 하나 추가하자").
// "추가"는 항상 초록 알약 배경으로 눈에 띄게 한다(다른 탭은 활성일 때만
// 배경이 켜짐). 색 자체는 책장의 "+ 책", 오늘 탭의 "+ 책 기록하기"와 같은
// --point-deep 계열로 통일한다(사용자 요청: "책 추가 버튼들은 전부 오늘에
// 있는 책 기록하기 버튼의 녹색을 따라 해줘" -- 한때 연두(--sprout)로 구분
// 지었던 적이 있으나 이번 요청으로 다시 통일했다).
const PARENT_TABS = [
  { href: "/today", label: "오늘", Icon: TodayIcon },
  { href: "/library", label: "책장", Icon: LibraryIcon },
  { href: "/library/add", label: "추가", Icon: AddIcon, accent: "highlight" },
  { href: "/group", label: "그룹", Icon: RecommendIcon },
] as const;

// 숲지기(선생님·기관·인플루언서 통칭) 탭. 예전엔 교사/큐레이터 탭이
// 따로였지만 하는 일이 같아서 하나로 합쳤다. 같은 데이터를 세 축으로
// 정리해서 보여준다 -- 아이별(아이들) / 책별(추천도서) / 숙제별(숙제).
// 그룹 관리(책 추가·숙제 만들기·승인·초대 코드)는 대시보드의 "관리하기"와
// 각 탭의 "+ 추가" 링크로 그룹 상세(/recommend/[groupId])에 들어가서 한다.
// 맨 오른쪽은 프로필·설정(스레드의 프로필 탭과 같은 자리) -- 아이콘 대신
// 지금 프로필의 얼굴(아이 아바타 / 곰·백로)을 그린다. 상단바의 얼굴+이름도
// 같은 곳으로 가지만, 손이 닿는 아래쪽에도 입구가 있어야 한다는 요청.
const PROFILE_TAB = { href: "/more", label: "프로필", face: true } as const;

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

// "그룹" 탭 아이콘 위 알림 점 -- 남은 숙제가 있으면 호박색 점, 전부
// 끝났으면 초록 원 안에 흰 체크(처음엔 색만 다른 점이었는데, "완료"가
// 모양으로도 바로 보이게 해 달라는 스펙 반영), 배정된 숙제가 없으면
// 표시하지 않는다. `child-group-bar.tsx`의 그룹 타일 배지와 같은 규칙.
// 숲길·숙제가 '그룹' 탭 하나로 합쳐지면서
// 이 점도 그 탭 아이콘에 뜬다. 화면을 옮길 때마다(pathname 변화) 다시
// 확인해서, 숙제를 체크하고 다른 탭으로 돌아오면 바로 반영된다.
// 체크 토글은 화면 이동 없이 바로 상태가 바뀌므로 read-toggles.tsx가
// 쏘는 "chaeksup:assignment-changed" 이벤트도 같이 듣는다.
function useHomeworkBadge(role: string | null, childId: string | null, pathname: string): HomeworkBadge {
  const [badge, setBadge] = useState<HomeworkBadge>("none");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (role !== "parent" || !childId) {
        if (alive) setBadge("none");
        return;
      }
      const result = await getHomeworkBadge(createClient(), childId);
      if (alive) setBadge(result);
    }
    load();
    window.addEventListener("chaeksup:assignment-changed", load);
    return () => {
      alive = false;
      window.removeEventListener("chaeksup:assignment-changed", load);
    };
  }, [role, childId, pathname]);

  return badge;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { role, loading, childId, childAvatar, operatorAvatar } = useProfile();
  const hidden = useHideOnScroll();
  const homeworkBadge = useHomeworkBadge(role, childId, pathname);

  if (isChromeHidden(pathname) || (!loading && role === null)) {
    return null;
  }

  // 역할 조회가 끝나기 전(role===null)에는 부모 탭을 기본값으로 보여준다 --
  // 로그인 직후 탭이 매번 깜빡이지 않도록.
  // 알약 바는 화면 폭을 가로로 꽉 채우고(스레드처럼) 탭이 균등하게 나눠
  // 갖는다 -- 내용 폭에 맞춰 가운데 몰려 있으면 5칸이 빡빡하고, 넓히면
  // 아이콘 아래에 이름을 붙일 자리가 생긴다. 맨 오른쪽은 프로필·설정.
  // "추가"를 알약 바 위로 띄운 독립 원형 버튼으로 뺐더니 "혼자 위에 떠
  // 있으니까 이상하다"는 지적을 받아, 다시 알약 바 안 제자리(책장 다음)로
  // 되돌렸다 -- 다른 탭과 같은 자리에 있되 연두색으로만 구분한다.
  const allTabs = role === "operator" ? OPERATOR_TABS : PARENT_TABS;
  const tabs = [...allTabs, PROFILE_TAB];
  // 프로필 탭에 그릴 얼굴 -- 상단바와 같은 규칙(아이는 고른 아바타,
  // 숲지기는 곰 기본, 로딩 중엔 토끼).
  const face = role === "operator" ? `face-${operatorAvatar ?? "bear"}` : `face-${childAvatar ?? "rabbit"}`;

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
      className="no-print fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-32px)] max-w-[420px] items-stretch gap-[4px] rounded-[26px] p-[6px] transition-transform duration-300 ease-out motion-reduce:transition-none"
      style={{
        bottom: "calc(var(--sb) + 14px)",
        // 96% 반투명이면 스크롤 중에 알약 뒤의 글자가 비쳐 보여 "내용이랑
        // 메뉴가 겹쳐 나온다"는 지적을 받았다 -- 완전 불투명으로.
        background: "var(--card)",
        willChange: "transform",
        boxShadow: "0 8px 28px -10px rgba(38,54,43,0.35), 0 0 0 1px rgba(38,54,43,0.06)",
        transform: hidden ? "translateY(calc(100% + var(--sb) + 20px))" : "translateY(0)",
      }}
    >
      {tabs.map((tab) => {
        const { href, label } = tab;
        const Icon = "Icon" in tab ? tab.Icon : null;
        const active = href === activeHref;
        const isHighlighted = "accent" in tab && tab.accent === "highlight";
        const showHomeworkDot = href === "/group" && homeworkBadge !== "none";
        return (
          <Link
            key={href}
            href={href}
            aria-label={showHomeworkDot ? `${label} · ${homeworkBadge === "done" ? "오늘 숙제 완료" : "오늘 숙제 있음"}` : label}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-[3px] rounded-[20px] py-[6px] transition-colors"
            style={{
              // "추가"는 다른 탭과 자리는 같지만 항상 초록 알약 배경으로
              // 구분한다(다른 탭은 활성일 때만 배경이 켜짐). 옅은 반투명
              // 초록이었더니 "버튼 자체가 연한 녹색으로 보인다"는 지적을
              // 받아, 지금은 쉬고 있을 때도 "+ 책"/"+ 책 기록하기"와 같은
              // --point-deep을 그대로 꽉 채운다 -- 눌려 있을 때(그 화면에
              // 있을 때)는 한 단계 더 짙은 --point-deepest로 구분한다.
              color: isHighlighted ? "#fff" : active ? "var(--point-deep)" : "var(--ink-2)",
              background: isHighlighted
                ? active
                  ? "var(--point-deepest)"
                  : "var(--point-deep)"
                : active
                  ? "rgba(47,168,79,0.14)"
                  : "transparent",
            }}
          >
            <span className="relative flex h-[24px] w-[24px] items-center justify-center">
              {isHighlighted ? (
                // 탭 배경 자체가 이미 짙은 초록으로 꽉 차 있으므로, 안에
                // 또 동그라미를 그리지 않고 흰 십자가만 그대로 얹는다.
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              ) : Icon ? (
                <Icon strokeWidth={active ? 2.4 : 1.9} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/illustrations/${face}.png`}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  className="h-[24px] w-[24px] rounded-full"
                  style={{ boxShadow: active ? "0 0 0 2px var(--point)" : "0 0 0 1.5px var(--rule)" }}
                />
              )}
              {showHomeworkDot && (
                <span
                  aria-hidden
                  className="absolute -right-[1px] -top-[1px] flex h-[10px] w-[10px] items-center justify-center rounded-full"
                  style={{
                    background: homeworkBadge === "done" ? "var(--point)" : "var(--lantern)",
                    boxShadow: "0 0 0 1.5px rgba(255,255,255,0.96)",
                  }}
                >
                  {homeworkBadge === "done" && (
                    <svg width="6" height="6" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5l3 3 7-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              )}
            </span>
            {/* 탭 이름은 항상 아이콘 아래에 붙여 둔다 -- 아이콘만으로는
                어디인지 헷갈린다는 지적(숲지기 4탭 -> 부모 탭도 같게). */}
            <span className="d whitespace-nowrap text-[11px] leading-[14px]" style={{ fontFamily: "var(--disp)" }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
