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
type GroupOption = { id: string; name: string; operator_name: string | null; operator_avatar?: string | null };

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
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({});
  // 그룹별(+ 전체) 오늘 숙제 상태 점 -- 남은 숙제 호박색, 전부 끝 초록 체크.
  const [assignmentBadges, setAssignmentBadges] = useState<Record<string, HomeworkBadge>>({});
  const [overallBadge, setOverallBadge] = useState<HomeworkBadge>("none");

  // 둘러보기(/recommend)가 그룹 탭의 첫 화면이고, 칩을 누르면 그 그룹(/group)으로 간다.
  const onBrowse = pathname === "/recommend";
  const onTab = pathname === GROUP_PATH || onBrowse;

  useEffect(() => {
    if (role !== "parent" || !onTab || !childId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [groupRes, { data: childRow }] = await Promise.all([
        supabase.from("group_members").select("groups(id, name, operator_name, operator_avatar)").eq("child_id", childId).eq("status", "approved"),
        supabase.from("children").select("active_group_id").eq("id", childId).single(),
      ]);
      // 0028(operator_avatar) 전이면 그 컬럼 없이 다시 읽는다.
      const groupRows = groupRes.error
        ? (await supabase.from("group_members").select("groups(id, name, operator_name)").eq("child_id", childId).eq("status", "approved")).data
        : groupRes.data;
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

  // 칩을 누르면 그 그룹을 저장하고 /group으로(보던 추천도서/숙제 탭은 유지).
  const pick = useCallback(
    async (id: string | null) => {
      setActiveGroupId(id);
      const params = new URLSearchParams();
      const currentTab = searchParams.get("tab");
      if (!onBrowse && currentTab) params.set("tab", currentTab);
      if (id) params.set("group", id);
      const qs = params.toString();
      router.push(qs ? `${GROUP_PATH}?${qs}` : GROUP_PATH);
      if (childId) {
        const supabase = createClient();
        await supabase.from("children").update({ active_group_id: id }).eq("id", childId);
      }
    },
    [router, childId, searchParams, onBrowse]
  );

  if (!onTab || role !== "parent" || !groups || groups.length === 0) return null;

  const queryGroup = searchParams.get("group");
  const selectedId = onBrowse
    ? "browse"
    : (queryGroup && groups.some((g) => g.id === queryGroup) && queryGroup) ||
      (activeGroupId && groups.some((g) => g.id === activeGroupId) && activeGroupId) ||
      "all";
  const totalBookCount = Object.values(bookCounts).reduce((s, n) => s + n, 0);

  // 칩 공통 모양 -- 반경 14px(앱의 버튼·입력과 같은 값).
  const chip = (on: boolean) => ({
    background: on ? "var(--point-deep)" : "var(--card)",
    color: on ? "#fff" : "var(--ink)",
    border: "1px solid " + (on ? "var(--point-deep)" : "var(--rule)"),
  });
  const chipBase = "relative flex h-[48px] flex-none flex-col justify-center rounded-[14px] px-3 text-left";

  return (
    // 그룹을 고르는 줄 하나만 고정한다. 추천도서/숙제 선택은 고른 그룹의 카드
    // 안(app/group/page.tsx)에 있어 "이 그룹의 것"으로 읽힌다.
    <div className="no-print fixed inset-x-0 z-40" style={{ top: "calc(52px + var(--st))", background: "var(--paper)" }}>
      <div className="mx-auto flex max-w-[520px] md:max-w-[760px] items-center gap-2 px-5 pt-2.5 pb-3">
        {/* 둘러보기는 왼쪽 고정 */}
        <Link href="/recommend" aria-current={onBrowse ? "page" : undefined} className={`${chipBase} w-[78px] items-center`} style={chip(onBrowse)}>
          <span className="d text-[14px] leading-tight">둘러보기</span>
          <span className="text-[10px] leading-tight" style={{ opacity: 0.75 }}>
            새 그룹
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pr-1" style={{ scrollbarWidth: "none" }}>
          <button type="button" onClick={() => pick(null)} aria-current={selectedId === "all" ? "true" : undefined} className={`${chipBase} w-[64px] items-center`} style={chip(selectedId === "all")}>
            <span className="d text-[14px] leading-tight">전체</span>
            <span className="text-[10px] leading-tight" style={{ opacity: 0.75 }}>
              {totalBookCount}권
            </span>
            <HomeworkStatusDot status={overallBadge} />
          </button>
          {groups.map((group) => {
            const active = group.id === selectedId;
            return (
              <button key={group.id} type="button" onClick={() => pick(group.id)} aria-current={active ? "true" : undefined} className={`${chipBase} w-[136px]`} style={chip(active)}>
                <span className="flex w-full items-center gap-2">
                  {/* 숲지기 캐릭터(곰/백로)를 작게 왼쪽에 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/illustrations/face-${group.operator_avatar === "egret" ? "egret" : "bear"}.png`}
                    alt=""
                    title={group.operator_name ?? undefined}
                    className="h-[26px] w-[26px] flex-none rounded-full"
                    style={{ background: "#fff" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="d block w-full truncate text-[13px] leading-tight">{group.name}</span>
                    <span className="block text-[10px] leading-tight" style={{ opacity: 0.75 }}>
                      {bookCounts[group.id] ?? 0}권
                    </span>
                  </span>
                </span>
                <HomeworkStatusDot status={assignmentBadges[group.id] ?? "none"} />
              </button>
            );
          })}
        </div>

        <Link href="/search" aria-label="숙제·추천도서 검색" className="flex flex-none items-center justify-center pl-0.5" style={{ color: "var(--ink-2)" }}>
          <SearchIcon width={19} height={19} />
        </Link>
      </div>
    </div>
  );
}
