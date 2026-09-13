import Link from "next/link";
import type { TodayAssignment } from "@/components/assignment-today";
import { isAssignmentDone } from "@/lib/assignment-status";
import { dueBadge, effectiveRange, formatShortMd } from "@/lib/assignment-period";

const TONE_COLOR: Record<"today" | "tomorrow" | "overdue", string> = {
  today: "var(--lantern)",
  tomorrow: "var(--point)",
  overdue: "var(--berry)",
};

function recordHref(book: TodayAssignment["books"][number], groupId: string): string {
  return `/library/add?bookId=${encodeURIComponent(book.id)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(groupId)}`;
}

/** 지금 이 숙제에서 다음으로 할 일 하나 -- 오늘 탭은 요약이라 버튼도
 * 하나만 보여준다(제일 급한 것). 안 읽은 책이 있으면 그 책 읽기부터,
 * 책은 다 읽었는데 답 안 한 질문이 있으면 그것부터, 전부 끝났으면 완료. */
function nextAction(a: TodayAssignment): { label: string; href: string; tone: "action" | "done" } {
  const unread = a.books.find((b) => !b.completed);
  if (unread) return { label: "읽기 시작", href: recordHref(unread, a.groupId), tone: "action" };
  const unanswered = a.missions.find((m) => m.type === "question" && !m.answerText?.trim());
  if (unanswered) {
    return {
      label: "답 적기",
      href: `/group?tab=assignments&group=${encodeURIComponent(a.groupId)}#mission-${unanswered.id}`,
      tone: "action",
    };
  }
  return { label: "완료 · 다시 보기", href: `/group?tab=assignments&group=${encodeURIComponent(a.groupId)}#${a.id}`, tone: "done" };
}

/** '오늘' 탭의 숙제 요약 -- 상세(책마다 기록·질문 답변)는 그룹 탭이 맡고,
 * 여기는 "대표 책 표지 · 마감일 · 진행 상태 · 다음 행동 버튼"까지만 압축해
 * 한눈에 보여준다(사용자 요청: 텍스트 한 줄이 아니라 실제 상태·행동이
 * 보이게). 같은 그룹 숙제끼리는 구분선 없이 묶는다. */
export default function AssignmentSummary({ assignments }: { assignments: TodayAssignment[] }) {
  const sections: { groupName: string; assignments: TodayAssignment[] }[] = [];
  for (const assignment of assignments) {
    const section = sections.find((s) => s.groupName === assignment.groupName);
    if (section) section.assignments.push(assignment);
    else sections.push({ groupName: assignment.groupName, assignments: [assignment] });
  }

  return (
    <div>
      {sections.map((section, sIndex) => (
        <div
          key={section.groupName}
          className={sIndex > 0 ? "mx-[24px]" : undefined}
          style={sIndex > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
        >
          <p className={`text-xs ${sIndex > 0 ? "pt-3" : "px-[24px] pt-3"}`} style={{ color: "var(--lantern)" }}>
            {section.groupName}
          </p>
          {section.assignments.map((assignment) => {
            const due = effectiveRange(assignment).end;
            const done = isAssignmentDone(assignment);
            const badge = done ? null : dueBadge(due);
            const completedCount = assignment.books.filter((b) => b.completed).length;
            const cover = assignment.books.find((b) => b.coverUrl)?.coverUrl ?? null;
            const action = nextAction(assignment);
            return (
              <div key={assignment.id} className={`flex items-center gap-3 py-2.5 ${sIndex > 0 ? "" : "px-[24px]"}`}>
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-11 w-8 flex-none rounded object-cover" style={{ border: "1px solid var(--rule)" }} />
                ) : (
                  <span className="block h-11 w-8 flex-none rounded" style={{ background: "var(--paper)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="d text-xs" style={{ color: badge ? TONE_COLOR[badge.tone] : "var(--ink-2)" }}>
                      {formatShortMd(due)}까지
                    </span>
                    {badge && (
                      <span
                        className="d rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        style={{ background: TONE_COLOR[badge.tone] }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <p className="d truncate text-sm">{assignment.title}</p>
                  {assignment.books.length > 0 && (
                    <p className="truncate text-[11px]" style={{ color: "var(--ink-2)" }}>
                      {assignment.books.length}권 중 {completedCount}권 읽었어요
                    </p>
                  )}
                </div>
                <Link
                  href={action.href}
                  className="d flex-none whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold"
                  style={
                    action.tone === "done"
                      ? { color: "var(--point-deep)", background: "rgba(47,168,79,0.12)" }
                      : { color: "#fff", background: done ? "var(--point)" : "var(--point-deep)" }
                  }
                >
                  {action.label}
                </Link>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
