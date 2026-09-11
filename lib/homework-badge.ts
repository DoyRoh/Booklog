import type { SupabaseClient } from "@supabase/supabase-js";
import { isCurrent } from "@/lib/assignment-period";

export type HomeworkBadge = "none" | "pending" | "done";

// 하단 탭 "숙제" 아이콘 위 알림 점 -- 오늘 진행 중인 숙제가 있으면 빨간
// 점, 그 숙제의 책을 전부 읽었으면 초록 점, 진행 중인 숙제가 없으면 점
// 없음. 탭을 그릴 때마다 도는 가벼운 조회라 lib/assignments.ts의
// fetchAssignments(표지·낭독 녹음 서명 URL까지 계산)를 그대로 쓰지 않고
// 필요한 것만 최소로 가져온다.
export async function getHomeworkBadge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  childId: string
): Promise<HomeworkBadge> {
  const { data: memberGroupRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("child_id", childId)
    .eq("status", "approved");
  const groupIds = (memberGroupRows ?? []).map((row) => row.group_id as string);
  if (groupIds.length === 0) return "none";

  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select("id, start_date, end_date, created_at, assignment_books(book_id)")
    .in("group_id", groupIds);

  type Row = {
    id: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    assignment_books: { book_id: string }[];
  };

  const current = ((assignmentRows ?? []) as unknown as Row[]).filter((row) =>
    isCurrent({ startDate: row.start_date, endDate: row.end_date, createdAt: row.created_at })
  );
  if (current.length === 0) return "none";

  const totalBooks = current.reduce((sum, row) => sum + row.assignment_books.length, 0);
  if (totalBooks === 0) return "done";

  const assignmentIds = current.map((row) => row.id);
  const { data: completionRows } = await supabase
    .from("assignment_completion")
    .select("completed")
    .eq("child_id", childId)
    .in("assignment_id", assignmentIds);

  const doneCount = (completionRows ?? []).filter((row) => row.completed).length;
  return doneCount >= totalBooks ? "done" : "pending";
}
