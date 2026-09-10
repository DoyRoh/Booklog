"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AssignmentToday, { type TodayAssignment } from "@/components/assignment-today";
import { SearchIcon } from "@/components/icons/misc-icons";
import { effectiveRange, isPast, isThisWeek, isUpcoming, matchesQuery } from "@/lib/assignment-period";

// 숙제 탭. 검색창 + (검색 중이면) 전체에서 찾은 숙제 / (아니면) 이번 주
// 숙제 → 다가오는 숙제 → "지난 숙제 보기". 지난 숙제 화면(mode="past")도
// 같은 컴포넌트 -- 지난 것만 보여주고 검색은 똑같이 된다.
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

  const { found, thisWeek, upcoming, past } = useMemo(() => {
    const byStart = (dir: 1 | -1) => (a: TodayAssignment, b: TodayAssignment) =>
      dir * effectiveRange(a).start.localeCompare(effectiveRange(b).start);
    return {
      found: assignments.filter((a) => matchesQuery(a, query)).sort(byStart(-1)),
      thisWeek: assignments.filter(isThisWeek).sort(byStart(1)),
      upcoming: assignments.filter(isUpcoming).sort(byStart(1)),
      // 지난 숙제는 최근에 끝난 것부터
      past: assignments
        .filter(isPast)
        .sort((a, b) => effectiveRange(b).end.localeCompare(effectiveRange(a).end)),
    };
  }, [assignments, query]);

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
          placeholder={mode === "past" ? "지난 숙제 검색 (제목·책·작가·그룹)" : "숙제 검색 (제목·책·작가·그룹)"}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      {searching ? (
        found.length === 0 ? (
          empty("찾는 숙제가 없어요.")
        ) : (
          <AssignmentToday childId={childId} childName={childName} assignments={found} voiceAllowed={voiceAllowed} />
        )
      ) : mode === "past" ? (
        past.length === 0 ? (
          empty("아직 끝난 숙제가 없어요.")
        ) : (
          <AssignmentToday childId={childId} childName={childName} assignments={past} voiceAllowed={voiceAllowed} />
        )
      ) : (
        <>
          <p className="d mt-5 text-base">이번 주 숙제</p>
          {thisWeek.length === 0 ? (
            empty("이번 주에는 숙제가 없어요.")
          ) : (
            <AssignmentToday childId={childId} childName={childName} assignments={thisWeek} voiceAllowed={voiceAllowed} />
          )}

          {upcoming.length > 0 && (
            <>
              <p className="d mt-8 text-base">다가오는 숙제</p>
              <AssignmentToday childId={childId} childName={childName} assignments={upcoming} voiceAllowed={voiceAllowed} />
            </>
          )}

          <Link
            href="/assignments/past"
            className="d mt-8 block rounded-[14px] border py-3 text-center text-sm"
            style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
          >
            지난 숙제 보기{past.length > 0 ? ` (${past.length})` : ""}
          </Link>
        </>
      )}
    </div>
  );
}
