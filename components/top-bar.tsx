"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreIcon, BadgeIcon } from "@/components/icons/tab-icons";
import { useProfile } from "@/components/profile-context";
import { isChromeHidden } from "@/lib/nav";

// 화면마다 따로 "오늘"/"책장" 같은 제목을 두는 대신, 부모 계정이면
// "{아이 이름}의 책숲"을 상단에 고정으로 띄운다 -- 지금 어느 탭인지는
// 하단 탭 강조 표시로 이미 알 수 있다. '더보기'도 같은 줄 우측에 둔다.
export default function TopBar() {
  const pathname = usePathname();
  const { role, childName, loading } = useProfile();

  // 인증 화면에서는 항상 숨기고, 로그인이 안 된 상태(역할 조회가 끝났는데
  // role이 없음)에서도 숨긴다 -- 로그아웃 상태로 /teacher 같은 경로에
  // 들어왔을 때 탭이 그대로 떠 있던 문제.
  if (isChromeHidden(pathname) || (!loading && role === null)) {
    return null;
  }

  const title = role === "parent" && childName ? `${childName}의 책숲` : "책숲";
  const moreActive = pathname === "/more" || pathname.startsWith("/more/");
  const badgesActive = pathname === "/badges" || pathname.startsWith("/badges/");

  return (
    <div
      className="no-print fixed inset-x-0 top-0 z-50 border-b"
      style={{ paddingTop: "var(--st)", background: "var(--paper)", borderColor: "var(--rule)" }}
    >
      <div className="mx-auto flex max-w-[520px] items-center justify-between px-5 py-2.5">
        <span className="d text-lg" style={{ color: "var(--ink)" }}>
          {title}
        </span>
        <div className="flex items-center gap-4">
          {role === "parent" && (
            <Link
              href="/badges"
              aria-label="배지"
              className="flex items-center gap-1"
              style={{ color: badgesActive ? "var(--ink)" : "var(--ink-2)" }}
            >
              <span className="d text-xs">배지</span>
              <BadgeIcon width={20} height={20} strokeWidth={badgesActive ? 2.4 : 1.9} />
            </Link>
          )}
          <Link
            href="/more"
            aria-label="더보기"
            className="flex items-center gap-1"
            style={{ color: moreActive ? "var(--ink)" : "var(--ink-2)" }}
          >
            <span className="d text-xs">더보기</span>
            <MoreIcon width={20} height={20} strokeWidth={moreActive ? 2.4 : 1.9} />
          </Link>
        </div>
      </div>
    </div>
  );
}
