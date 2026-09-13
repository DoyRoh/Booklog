"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/profile-context";
import { PlusIcon, SearchIcon } from "@/components/icons/misc-icons";
import { getGroupHomeworkBadges, type HomeworkBadge } from "@/lib/homework-badge";

/**
 * '그룹' 탭(추천도서·숙제 소제목 탭을 한 화면에 합친 `/group`) 상단의
 * 그룹 전환. 숲지기 쪽 `OperatorGroupBar`와 같은 이유로 루트 레이아웃에
 * 한 번만 마운트한다 -- 화면을 옮길 때마다 그리면 언마운트돼 깜빡인다.
 * `children.active_group_id`에 저장해 뒀다가, 추천도서/숙제 소제목 탭을
 * 오갈 때도 같은 그룹이 그대로 이어진다("여기저기서 그룹전환하느라
 * 정신없다"는 지적으로, 원래 따로였던 숲길·숙제 탭 자체를 하나로 합치고
 * 그 안의 그룹 선택도 하나로 통일했다).
 *
 * 부모 쪽은 그룹이 하나뿐이어도 "전체" 개념이 있어(숲지기 쪽엔 없음)
 * 타일 목록이 항상 뜬다. 타일은 큼직한 이미지(색 상자 + 이니셜)와 큰
 * 숫자(지금 보고 있는 소제목 탭 기준 개수 -- 숙제 탭이면 숙제 수, 추천도서
 * 탭이면 책 수), 이름은 그 아래 작게(사용자 요청: "이미지와 숫자를 크게,
 * 이름은 아래에 작게"). 숙제/추천도서 소제목 탭은 배민 스타일 밑줄형
 * 두 칸 탭으로, 오른쪽엔 전체 검색(핵심 기능)으로 가는 돋보기.
 *
 * 바 높이 상수는 lib/group-bar-height.ts에 있다 -- "use client" 파일에서
 * export하면 서버 컴포넌트엔 숫자가 아니라 클라이언트 참조가 넘어간다.
 */
const GROUP_PATH = "/group";
const TILE_COLORS = ["#6B8F71", "#A6763F", "#D9A441", "#7C9C82", "#B5654A", "#5E7A6B", "#C9A66B"];

function tileColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TILE_COLORS[hash % TILE_COLORS.length];
}

type GroupOption = { id: string; name: string };

// 숙제 상태 점 -- 남은 숙제가 있으면 호박색 점, 전부 끝나면 초록 원 안에
// 흰색 체크(사용자 스펙: 그냥 색만 다른 점이 아니라 "다 됐다"는 게 모양
// 으로도 바로 보이게), 배정된 숙제가 없으면 아예 표시하지 않는다.
function HomeworkStatusDot({ status }: { status: HomeworkBadge }) {
  if (status === "none") return null;
  return (
    <span
      aria-hidden
      className="absolute -bottom-1 -right-1 flex h-[16px] w-[16px] items-center justify-center rounded-full"
      style={{ background: status === "done" ? "var(--point)" : "var(--lantern)", boxShadow: "0 0 0 2px #fff" }}
    >
      {status === "done" && (
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3 3 7-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export default function ChildGroupBar() {
  const { role, childId } = useProfile();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupOption[] | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  // 추천도서 탭의 "큰 숫자" -- 그룹별 책 권수.
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({});
  // 숙제 탭은 숫자 대신 상태 점("그룹에 2는 뭐야?"라는 질문을 받아, 개수
  // 대신 진행 중(호박색)·완료(초록) 점으로 바꿨다) -- 그룹별 + "전체" 합산.
  const [assignmentBadges, setAssignmentBadges] = useState<Record<string, HomeworkBadge>>({});
  const [overallBadge, setOverallBadge] = useState<HomeworkBadge>("none");

  const onTab = pathname === GROUP_PATH;
  // 기본 소제목 탭은 숙제(app/group/page.tsx와 같은 규칙).
  const tab = searchParams.get("tab") === "books" ? "books" : "assignments";

  useEffect(() => {
    if (role !== "parent" || !onTab || !childId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: groupRows }, { data: childRow }] = await Promise.all([
        supabase.from("group_members").select("groups(id, name)").eq("child_id", childId).eq("status", "approved"),
        supabase.from("children").select("active_group_id").eq("id", childId).single(),
      ]);
      if (cancelled) return;
      const list = ((groupRows as unknown as { groups: GroupOption | null }[] | null) ?? [])
        .map((r) => r.groups)
        .filter((g): g is GroupOption => Boolean(g))
        .filter((g, i, arr) => arr.findIndex((o) => o.id === g.id) === i);
      setGroups(list);
      setActiveGroupId(childRow?.active_group_id ?? null);

      const groupIds = list.map((g) => g.id);
      if (groupIds.length === 0) return;
      const [{ data: bookRows }, { byGroup, overall }] = await Promise.all([
        supabase.from("book_lists").select("group_id, book_list_items(id)").in("group_id", groupIds),
        getGroupHomeworkBadges(supabase, childId, groupIds),
      ]);
      if (cancelled) return;
      const bCounts: Record<string, number> = {};
      for (const row of (bookRows ?? []) as unknown as { group_id: string; book_list_items: unknown[] }[]) {
        bCounts[row.group_id] = (row.book_list_items ?? []).length;
      }
      setBookCounts(bCounts);
      setAssignmentBadges(byGroup);
      setOverallBadge(overall);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, onTab, childId, pathname]);

  const pick = useCallback(
    async (id: string | null) => {
      setActiveGroupId(id);
      // 추천도서/숙제 중 어느 소제목 탭을 보고 있었는지(tab=)는 그대로
      // 유지한 채 그룹만 바꾼다.
      const currentTab = searchParams.get("tab");
      const params = new URLSearchParams();
      if (currentTab) params.set("tab", currentTab);
      if (id) params.set("group", id);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
      if (childId) {
        const supabase = createClient();
        await supabase.from("children").update({ active_group_id: id }).eq("id", childId);
      }
    },
    [pathname, router, childId, searchParams]
  );

  if (!onTab || role !== "parent" || !groups || groups.length === 0) return null;

  const queryGroup = searchParams.get("group");
  const tabHref = (t: "assignments" | "books") => {
    const params = new URLSearchParams();
    if (t === "books") params.set("tab", "books");
    if (queryGroup) params.set("group", queryGroup);
    else if (activeGroupId) params.set("group", activeGroupId);
    const qs = params.toString();
    return qs ? `${GROUP_PATH}?${qs}` : GROUP_PATH;
  };
  const selectedId =
    (queryGroup && groups.some((g) => g.id === queryGroup) && queryGroup) ||
    (activeGroupId && groups.some((g) => g.id === activeGroupId) && activeGroupId) ||
    "all";
  const isAssignmentsTab = tab === "assignments";
  const bookCountFor = (groupId: string) => bookCounts[groupId] ?? 0;
  const totalBookCount = Object.values(bookCounts).reduce((s, n) => s + n, 0);

  return (
    // 시안처럼 흰 패널 없이 배경(세이지)과 이어지게 둔다(사용자 지적:
    // "숙제·추천도서 선택 메뉴 흰색 배경 없애라"). 고정 바라 배경색은
    // 불투명해야 아래 내용이 비치지 않으므로 --paper를 그대로 쓴다.
    <div className="no-print fixed inset-x-0 z-40" style={{ top: "52px", background: "var(--paper)" }}>
      <div className="mx-auto flex max-w-[520px] gap-3 overflow-x-auto px-5 pt-2.5 pb-3" style={{ scrollbarWidth: "none" }}>
        <button
          type="button"
          onClick={() => pick(null)}
          aria-current={selectedId === "all" ? "true" : undefined}
          className="flex w-[64px] flex-none flex-col items-center gap-1"
        >
          <span
            className="d relative flex h-[56px] w-[56px] flex-col items-center justify-center rounded-[16px]"
            style={{
              // 바 자체가 세이지 배경이라, 안 켜진 타일은 --paper면 묻힌다 → 옅은 초록 판.
              background: selectedId === "all" ? "var(--point-deep)" : "var(--sprout-pale)",
              color: selectedId === "all" ? "#fff" : "var(--ink)",
              border: selectedId === "all" ? "2px solid var(--point-deep)" : "1px solid transparent",
              boxShadow: selectedId === "all" ? "0 4px 10px rgba(27,94,58,0.28)" : "none",
            }}
          >
            <span className="text-[13px] leading-none">전체</span>
            {!isAssignmentsTab && <span className="mt-1 text-[17px] font-bold leading-none">{totalBookCount}</span>}
            {isAssignmentsTab && <HomeworkStatusDot status={overallBadge} />}
          </span>
          <span
            className="w-full truncate text-center text-[10px] leading-tight"
            style={{ color: selectedId === "all" ? "var(--point-deep)" : "var(--ink-2)", fontWeight: selectedId === "all" ? 600 : 400 }}
          >
            전체
          </span>
        </button>

        {groups.map((group) => {
          const active = group.id === selectedId;
          const bookCount = bookCountFor(group.id);
          const badge = assignmentBadges[group.id] ?? "none";
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => pick(group.id)}
              aria-current={active ? "true" : undefined}
              className="flex w-[64px] flex-none flex-col items-center gap-1"
            >
              {/* 이미지(색 상자 + 이니셜)와 배지를 한 타일에 -- 선택
                  상태는 초록 테두리 + 배경 톤 변화로 명확히 구분. 배지는
                  추천도서 탭이면 권수 숫자, 숙제 탭이면 진행 상태 점. */}
              <span
                className="d relative flex h-[56px] w-[56px] items-center justify-center rounded-[16px] text-xl text-white"
                style={{
                  background: tileColor(group.name),
                  border: active ? "2px solid var(--point-deep)" : "2px solid transparent",
                  boxShadow: active ? "0 4px 10px rgba(27,94,58,0.28)" : "0 1px 2px rgba(38,54,43,0.15)",
                  opacity: active ? 1 : 0.72,
                }}
              >
                {group.name.trim().charAt(0)}
                {isAssignmentsTab
                  ? <HomeworkStatusDot status={badge} />
                  : bookCount > 0 && (
                      <span
                        className="d absolute -bottom-1.5 -right-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1 text-[12px] font-bold"
                        style={{ background: "#fff", color: "var(--point-deep)", border: "1.5px solid var(--point-deep)" }}
                      >
                        {bookCount > 99 ? "99+" : bookCount}
                      </span>
                    )}
              </span>
              <span
                className="w-full truncate text-center text-[10px] leading-tight"
                style={{ color: active ? "var(--point-deep)" : "var(--ink-2)", fontWeight: active ? 600 : 400 }}
              >
                {group.name}
              </span>
            </button>
          );
        })}

        <Link href="/recommend" className="flex w-[64px] flex-none flex-col items-center gap-1" aria-label="다른 그룹 찾기">
          <span
            className="flex h-[56px] w-[56px] items-center justify-center rounded-[16px] border border-dashed"
            style={{ borderColor: "rgba(38,54,43,0.28)", color: "var(--ink-2)" }}
          >
            <PlusIcon width={20} height={20} />
          </span>
          <span className="w-full truncate text-center text-[10px] leading-tight" style={{ color: "var(--ink-2)" }}>
            그룹 찾기
          </span>
        </Link>
      </div>

      {/* 숙제 / 추천도서 소제목 탭 -- 채워진 알약 세그먼트 컨트롤. 예전
          밑줄 탭은 선택 안 된 쪽 글자가 옅어서 "탭 자체가 잘 안 보인다"는
          지적을 받아, 옅은 초록 트랙 위에 선택된 쪽만 짙은 초록 알약으로
          채우고 선택 안 된 쪽도 진한 글자(--ink, 굵게)로 바꿔 두 라벨 다
          한눈에 읽히게 했다. 오른쪽 끝의 돋보기는 전체 검색(/search,
          핵심 기능)으로. */}
      <div className="mx-auto flex max-w-[520px] items-center gap-2 px-5 pt-1.5 pb-2.5">
        <div className="flex flex-1 gap-1 rounded-full p-1" style={{ background: "var(--sprout-pale)" }}>
          {(
            [
              { key: "assignments", label: "숙제" },
              { key: "books", label: "추천도서" },
            ] as const
          ).map((t) => {
            const on = t.key === tab;
            return (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                aria-current={on ? "page" : undefined}
                className="d flex-1 rounded-full py-2 text-center text-[14px]"
                style={{
                  background: on ? "var(--point-deep)" : "transparent",
                  color: on ? "#fff" : "var(--ink)",
                  fontWeight: on ? 700 : 600,
                  boxShadow: on ? "0 2px 6px rgba(27,94,58,0.28)" : "none",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/search"
          aria-label="숙제·추천도서 검색"
          className="flex flex-none items-center justify-center"
          style={{ color: "var(--ink-2)" }}
        >
          <SearchIcon width={19} height={19} />
        </Link>
      </div>
    </div>
  );
}
