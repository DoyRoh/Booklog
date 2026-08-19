import Link from "next/link";
import type { TodayAssignment } from "@/components/assignment-today";

// '오늘' 탭은 숙제 요약만 보여준다 -- 그룹명/제목/완료 여부 정도의 한 줄
// 리스트고, 실제로 책을 골라 기록하는 상세 화면은 /today/assignments다.
// 같은 그룹의 숙제끼리는 구분선 없이 한 섹션으로 묶고, 섹션(그룹) 사이에만
// 구분선을 둔다.
export default function AssignmentSummary({ assignments }: { assignments: TodayAssignment[] }) {
  const sections: { groupName: string; assignments: TodayAssignment[] }[] = [];
  for (const assignment of assignments) {
    const section = sections.find((s) => s.groupName === assignment.groupName);
    if (section) section.assignments.push(assignment);
    else sections.push({ groupName: assignment.groupName, assignments: [assignment] });
  }

  return (
    <div
      className="mt-3 overflow-hidden rounded-[var(--r)] border"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      {sections.map((section, sIndex) => (
        <div key={section.groupName} style={sIndex > 0 ? { borderTop: "1px solid var(--rule)" } : undefined}>
          <p className="px-4 pt-3 text-sm" style={{ color: "var(--lantern)" }}>
            {section.groupName}
          </p>
          {section.assignments.map((assignment) => {
            const completedCount = assignment.books.filter((book) => book.completed).length;
            const allDone = assignment.books.length > 0 && completedCount === assignment.books.length;
            return (
              <Link
                key={assignment.id}
                href={`/today/assignments#${assignment.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <p className="d truncate text-base">{assignment.title}</p>
                <span
                  className="d flex-none rounded-full px-3 py-1 text-sm"
                  style={{
                    background: allDone ? "rgba(47,168,79,0.12)" : "var(--paper)",
                    color: allDone ? "var(--point-deep)" : "var(--ink-2)",
                  }}
                >
                  {completedCount}/{assignment.books.length} 완료
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
