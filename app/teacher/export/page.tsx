import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import ExportButtons from "@/components/export-buttons";
import { loadOperatorBookSections } from "@/lib/operator-books";
import { loadOperatorAssignmentSections, type OperatorAssignmentCard } from "@/lib/operator-assignments";
import { effectiveRange } from "@/lib/assignment-period";
import { shortDate } from "@/components/log-row";

const MISSION_LABELS: Record<string, string> = { read: "읽기", question: "질문", voice: "낭독" };

// 숲지기의 추천도서·숙제를 표로 내보낸다 -- 엑셀(CSV)로 내려받거나 그대로
// 인쇄(PDF로 저장)한다. 학부모 안내문·학급 보관용으로 쓰라는 요청.
export default async function TeacherExportPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; type?: string }>;
}) {
  const { group: groupParam, type: typeParam } = await searchParams;
  const type = typeParam === "assignments" ? "assignments" : "books";
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[640px] px-5 pt-[20px]">
        <h1 className="d text-xl">내보내기</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const backHref = type === "assignments" ? "/teacher/assignments" : "/teacher/books";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  // 표 머리글 + 줄. CSV와 화면 표가 같은 데이터를 쓰도록 문자열 배열 하나로 만든다.
  let groupName = "";
  let header: string[] = [];
  let rows: string[][] = [];
  let summary = "";
  // 화면 표에서만 "아이별 완료 여부" 열을 이름 칩(완료=초록/미완료=회색)으로
  // 색까지 보여주기 위해 원본 데이터를 따로 들고 있는다(CSV는 문자열 그대로).
  let assignmentCards: OperatorAssignmentCard[] = [];

  if (type === "books") {
    const sections = await loadOperatorBookSections(supabase, userId, groupParam);
    const section = sections.find((s) => s.id === groupParam) ?? sections[0] ?? null;
    groupName = section?.name ?? "";
    header = ["번호", "올린 날", "분야", "제목", "저자", "읽은 아이", "숙제 중"];
    rows = (section?.books ?? []).map((book, index) => [
      String(index + 1),
      shortDate(book.addedAt),
      book.categories.join(" · "),
      book.title,
      book.author ?? "",
      `${book.readCount}/${section?.memberCount ?? 0}명`,
      book.inAssignment ? "○" : "",
    ]);
    summary = `추천도서 ${rows.length}권 · 그룹원 ${section?.memberCount ?? 0}명`;
  } else {
    const sections = await loadOperatorAssignmentSections(supabase, userId);
    const section = sections.find((s) => s.id === groupParam) ?? sections[0] ?? null;
    groupName = section?.name ?? "";
    assignmentCards = section?.cards ?? [];
    // "완료" 숫자만으론 누가 안 했는지 알 수 없다는 지적으로, 아이 이름마다
    // 완료 여부를 적은 열을 하나 더 붙였다(숙제 관리에 바로 쓰라는 요청).
    header = ["번호", "낸 날", "마감", "제목", "책", "미션", "완료", "아이별 완료 여부"];
    rows = assignmentCards.map((card, index) => {
      const range = effectiveRange(card);
      return [
        String(index + 1),
        shortDate(range.start),
        shortDate(range.end),
        card.title,
        card.bookTitles.join(" · "),
        card.missions.map((m) => MISSION_LABELS[m.type] ?? m.type).join(" · "),
        `${card.completed}/${card.total}명`,
        card.children.map((c) => `${c.name}(${c.done ? "완료" : "미완료"})`).join(", "),
      ];
    });
    summary = `숙제 ${rows.length}개`;
  }

  const title = `${groupName} ${type === "books" ? "추천도서" : "숙제"} 목록`;
  const filename = `책숲-${groupName || "그룹"}-${type === "books" ? "추천도서" : "숙제"}`;

  return (
    <div className="mx-auto max-w-[640px] px-5 pt-[20px] pb-[16px]">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href={backHref} className="flex-none text-sm" style={{ color: "var(--point)" }}>
          ← 돌아가기
        </Link>
        <ExportButtons filename={filename} rows={[header, ...rows]} />
      </div>

      <div className="mt-6 border-b pb-4" style={{ borderColor: "var(--rule)" }}>
        <p className="d text-xl">{title}</p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          {today} 기준 · {summary}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 내보낼 내용이 없어요.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--r)] border" style={{ borderColor: "var(--rule)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ background: "var(--paper)" }}>
                {header.map((cell) => (
                  <th key={cell} className="whitespace-nowrap px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const childStatuses = type === "assignments" ? assignmentCards[rowIndex]?.children : undefined;
                const childrenColIndex = header.length - 1;
                return (
                  <tr key={row[0]} style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}>
                    {row.map((cell, cellIndex) => {
                      if (childStatuses && cellIndex === childrenColIndex) {
                        return (
                          <td key={cellIndex} className="px-3 py-2">
                            <span className="flex flex-wrap gap-1">
                              {childStatuses.length === 0 ? (
                                <span style={{ color: "var(--ink-2)" }}>-</span>
                              ) : (
                                childStatuses.map((c) => (
                                  <span
                                    key={c.childId}
                                    className="d whitespace-nowrap rounded-full px-2 py-0.5 text-xs"
                                    style={{
                                      background: c.done ? "rgba(47,168,79,0.12)" : "var(--paper)",
                                      color: c.done ? "var(--point-deep)" : "var(--ink-2)",
                                    }}
                                  >
                                    {c.name}
                                  </span>
                                ))
                              )}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td
                          key={cellIndex}
                          className={cellIndex === 0 ? "px-3 py-2 tabular-nums" : "px-3 py-2"}
                          style={cellIndex === 0 ? { color: "var(--ink-2)" } : undefined}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
