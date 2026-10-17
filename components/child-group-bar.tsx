"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/profile-context";
import { SearchIcon } from "@/components/icons/misc-icons";
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
const GROUP_TAB_KEY = "chaeksup:group-tab";
type GroupOption = { id: string; name: string; operator_name: string | null };

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

  // 둘러보기(/recommend)에서도 같은 그룹 박스 줄을 보여준다(소제목 탭 줄은 없이).
  // 박스를 누르면 그 그룹의 /group 화면으로 간다.
  const onBrowse = pathname === "/recommend";
  const onTab = pathname === GROUP_PATH || onBrowse;
  // 기본 소제목 탭은 추천도서(app/group/page.tsx와 같은 규칙).
  const tab = searchParams.get("tab") === "assignments" ? "assignments" : "books";

  // 숙제/추천도서 중 마지막으로 본 쪽을 기억해 둔다 -- 하단 "그룹"을 다시
  // 누르면 그쪽이 열리게(components/bottom-nav.tsx). sessionStorage라 앱을
  // 새로 켜면 지워지고 다시 추천도서부터 보인다.
  useEffect(() => {
    if (!onTab || onBrowse) return;
    try {
      sessionStorage.setItem(GROUP_TAB_KEY, tab);
    } catch {}
  }, [onTab, onBrowse, tab]);

  useEffect(() => {
    if (role !== "parent" || !onTab || !childId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: groupRows }, { data: childRow }] = await Promise.all([
        supabase.from("group_members").select("groups(id, name, operator_name)").eq("child_id", childId).eq("status", "approved"),
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
      router.push(qs ? `${GROUP_PATH}?${qs}` : GROUP_PATH);
      if (childId) {
        const supabase = createClient();
        await supabase.from("children").update({ active_group_id: id }).eq("id", childId);
      }
    },
    [router, childId, searchParams]
  );

  if (!onTab || role !== "parent" || !groups || groups.length === 0) return null;

  const queryGroup = searchParams.get("group");
  const tabHref = (t: "assignments" | "books") => {
    const params = new URLSearchParams();
    if (t === "assignments") params.set("tab", "assignments");
    if (queryGroup) params.set("group", queryGroup);
    else if (activeGroupId) params.set("group", activeGroupId);
    const qs = params.toString();
    return qs ? `${GROUP_PATH}?${qs}` : GROUP_PATH;
  };
  const selectedId = onBrowse ? "none" :
    (queryGroup && groups.some((g) => g.id === queryGroup) && queryGroup) ||
    (activeGroupId && groups.some((g) => g.id === activeGroupId) && activeGroupId) ||
    "all";
  const isAssignmentsTab = tab === "assignments";
  const bookCountFor = (groupId: string) => bookCounts[groupId] ?? 0;
  const totalBookCount = Object.values(bookCounts).reduce((s, n) => s + n, 0);

  const chipBase = "flex h-[48px] flex-none flex-col justify-center rounded-[14px] px-3 text-left";

  return (
    // 고정 바 하나 안에 "그룹 칩 줄 + 추천도서·숙제·둘러보기 탭"을 모았다.
    // 칩은 작은 카드(그룹명 위, 숲지기 이름 아래)로 정돈하고, 둘러보기에서는
    // 탭만 남는다. 바 배경은 페이지 배경과 같은 --paper(불투명).
    <div className="no-print fixed inset-x-0 z-40" style={{ top: "calc(52px + var(--st))", background: "var(--paper)" }}>
      {!onBrowse && (
        <div className="mx-auto flex max-w-[520px] md:max-w-[760px] gap-2 px-5 pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => pick(null)}
            aria-current={selectedId === "all" ? "true" : undefined}
            className={`${chipBase} relative w-[64px] items-center`}
            style={{
              background: selectedId === "all" ? "var(--point-deep)" : "var(--card)",
              color: selectedId === "all" ? "#fff" : "var(--ink)",
              border: "1px solid " + (selectedId === "all" ? "var(--point-deep)" : "var(--rule)"),
            }}
          >
            <span className="d text-[14px] leading-tight">전체</span>
            <span className="text-[10px] leading-tight" style={{ opacity: 0.75 }}>
              {isAssignmentsTab ? "모든 숙제" : `${totalBookCount}권`}
            </span>
            {isAssignmentsTab && <HomeworkStatusDot status={overallBadge} />}
          </button>

          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pr-1" style={{ scrollbarWidth: "none" }}>
            {groups.map((group) => {
              const active = group.id === selectedId;
              const badge = assignmentBadges[group.id] ?? "none";
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => pick(group.id)}
                  aria-current={active ? "true" : undefined}
                  className={`${chipBase} relative w-[118px]`}
                  style={{
                    background: active ? "var(--point-deep)" : "var(--card)",
                    color: active ? "#fff" : "var(--ink)",
                    border: "1px solid " + (active ? "var(--point-deep)" : "var(--rule)"),
                  }}
                >
                  <span className="d block w-full truncate text-[13px] leading-tight">{group.name}</span>
                  <span className="block w-full truncate text-[10px] leading-tight" style={{ opacity: 0.75 }}>
                    {group.operator_name || "숲지기"}
                    {!isAssignmentsTab && bookCountFor(group.id) > 0 ? ` · ${bookCountFor(group.id)}권` : ""}
                  </span>
                  {isAssignmentsTab && <HomeworkStatusDot status={badge} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 추천도서 · 숙제 · 둘러보기 -- 채워진 알약 세그먼트. 오른쪽 돋보기는 전체 검색. */}
      <div className="mx-auto flex max-w-[520px] md:max-w-[760px] items-center gap-2 px-5 pt-1.5 pb-2.5">
        <div className="flex flex-1 gap-1 rounded-full p-1" style={{ background: "var(--sprout-pale)" }}>
          {(
            [
              { key: "books", label: "추천도서", href: tabHref("books") },
              { key: "assignments", label: "숙제", href: tabHref("assignments") },
              { key: "browse", label: "둘러보기", href: "/recommend" },
            ] as const
          ).map((t) => {
            const on = onBrowse ? t.key === "browse" : t.key === tab;
            return (
              <Link
                key={t.key}
                href={t.href}
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
        <Link href="/search" aria-label="숙제·추천도서 검색" className="flex flex-none items-center justify-center" style={{ color: "var(--ink-2)" }}>
          <SearchIcon width={19} height={19} />
        </Link>
      </div>
    </div>
  );
}
