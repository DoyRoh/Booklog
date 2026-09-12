"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AssignmentToday, { isAssignmentDone, type TodayAssignment } from "@/components/assignment-today";
import { SearchIcon } from "@/components/icons/misc-icons";
import { effectiveRange, isPast, matchesQuery } from "@/lib/assignment-period";

// 숙제 탭. 이 화면 안의 빠른 필터(검색창)는 "지금 로드된 목록 안"에서만
// 찾는다 -- 완료·지난 자료까지 전부, 다른 그룹까지 가로질러 찾는 진짜
// 검색은 /search(핵심 기능)로 보낸다.
//
// 목록은 상태 3단으로: 지금 해야 할 숙제(미완료·마감 가까운 순) → 기한
// 지남(마감이 지난 미완료 -- 숨기지 않고 별도 표시) → 완료한 숙제(가장
// 최근 마감부터). 완료 조건(isAssignmentDone)은 기존 그대로 재사용한다.
export default function AssignmentsBrowser({
  childId,
  childName,
  assignments,
  voiceAllowed,
  mode,
}: {
  childId: string;
  childName: string | null;
  assignments: TodayAssignment[];
  voiceAllowed: boolean;
  mode: "current" | "past";
}) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  const { found, active, overdue, done } = useMemo(() => {
    const byEnd = (dir: 1 | -1) => (a: TodayAssignment, b: TodayAssignment) =>
      dir * effectiveRange(a).end.localeCompare(effectiveRange(b).end);
    const base = mode === "past" ? assignments.filter((a) => isPast(a)) : assignments;
    return {
      found: assignments.filter((a) => matchesQuery(a, query)).sort(byEnd(-1)),
      // 미완료 · 마감 가까운 순(가장 급한 것이 위).
      active: base.filter((a) => !isAssignmentDone(a) && !isPast(a)).sort(byEnd(1)),
      // 마감이 지난 미완료 -- 숨기지 않고 "기한 지남"으로 따로.
      overdue: base.filter((a) => !isAssignmentDone(a) && isPast(a)).sort(byEnd(-1)),
      // 완료한 숙제는 맨 아래, 최근 마감부터.
      done: base.filter((a) => isAssignmentDone(a)).sort(byEnd(-1)),
    };
  }, [assignments, query, mode]);

  const empty = (text: string) => (
    <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
      {text}
    </p>
  );

  return (
    <div>
      <label
        className="flex items-center gap-2 rounded-[14px] border px-3 py-2"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <SearchIcon width={16} height={16} style={{ color: "var(--ink-2)" }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이 목록에서 빠르게 찾기 (제목·책·작가·그룹)"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <Link href="/search" className="d mt-1.5 block text-right text-xs" style={{ color: "var(--point-deep)" }}>
        전체 숙제·추천도서 검색(완료·지난 자료 포함) ›
      </Link>

      {searching ? (
        found.length === 0 ? (
          empty("찾는 숙제가 없어요.")
        ) : (
          <AssignmentToday childId={childId} childName={childName} assignments={found} voiceAllowed={voiceAllowed} />
        )
      ) : (
        <>
          {mode === "current" && (
            <>
              <p className="d mt-6 text-base">지금 해야 할 숙제</p>
              {active.length === 0 ? (
                empty("지금 해야 할 숙제가 없어요.")
              ) : (
                <AssignmentToday childId={childId} childName={childName} assignments={active} voiceAllowed={voiceAllowed} />
              )}
            </>
          )}

          {overdue.length > 0 && (
            <>
              <p className="d mt-8 text-base" style={{ color: "var(--berry)" }}>
                기한 지남 · {overdue.length}개
              </p>
              <AssignmentToday childId={childId} childName={childName} assignments={overdue} voiceAllowed={voiceAllowed} />
            </>
          )}

          {done.length > 0 && (
            <>
              <p className="d mt-8 text-base">완료한 숙제 · {done.length}개</p>
              <AssignmentToday childId={childId} childName={childName} assignments={done} voiceAllowed={voiceAllowed} />
            </>
          )}

          {mode === "current" && (
            <Link
              href="/group/past"
              className="d mt-8 block rounded-[14px] border py-3 text-center text-sm"
              style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
            >
              지난 숙제 전체 보관함
            </Link>
          )}
        </>
      )}
    </div>
  );
}
