import Link from "next/link";
import type { TodayAssignment } from "@/components/assignment-today";

// '오늘' 탭은 숙제 요약만 보여준다 -- 그룹명/제목/완료 여부 정도의 한 줄
// 리스트고, 실제로 책을 골라 기록하는 상세 화면은 /today/assignments다.
export default function AssignmentSummary({ assignments }: { assignments: TodayAssignment[] }) {
  // 같은 그룹의 숙제끼리 붙어 보이도록 그룹명 기준으로 묶는다 -- 행마다
  // 이미 구분선이 있어서, 정렬만으로도 "그룹별 구분"이 자연스럽게 된다.
  const sorted = [...assignments].sort((a, b) => a.groupName.localeCompare(b.groupName, "ko"));

  return (
    <div
      className="mt-3 overflow-hidden rounded-[var(--r)] border"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      {sorted.map((assignment, index) => {
        const completedCount = assignment.books.filter((book) => book.completed).length;
        const allDone = assignment.books.length > 0 && completedCount === assignment.books.length;
        return (
          <Link
            key={assignment.id}
            href={`/today/assignments#${assignment.id}`}
            className="flex items-center justify-between gap-3 p-4"
            style={index > 0 ? { borderTop: "1px solid var(--rule)" } : undefined}
          >
            <div className="min-w-0">
              <p className="text-sm" style={{ color: "var(--lantern)" }}>
                {assignment.groupName}
              </p>
              <p className="d mt-0.5 truncate text-base">{assignment.title}</p>
            </div>
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
  );
}
