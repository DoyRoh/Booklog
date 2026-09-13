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

// 그룹 탭 바의 그룹별 타일 배지 -- 예전엔 그룹의 숙제 "개수"를 그대로
// 숫자로 보여줬는데("그룹에 2는 뭐야?"라는 질문을 받음), 위 getHomeworkBadge와
// 같은 기준(호박색=진행 중, 초록=완료)의 점으로 바꿔서 숫자를 해석할 필요가
// 없게 한다. 한 번의 왕복으로 모든 그룹을 같이 계산하고, "전체" 타일에 쓸
// 합산 상태도 같이 돌려준다.
export async function getGroupHomeworkBadges(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  childId: string,
  groupIds: string[]
): Promise<{ byGroup: Record<string, HomeworkBadge>; overall: HomeworkBadge }> {
  if (groupIds.length === 0) return { byGroup: {}, overall: "none" };

  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select("id, group_id, start_date, end_date, created_at, assignment_books(book_id)")
    .in("group_id", groupIds);

  type Row = {
    id: string;
    group_id: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    assignment_books: { book_id: string }[];
  };

  const current = ((assignmentRows ?? []) as unknown as Row[]).filter((row) =>
    isCurrent({ startDate: row.start_date, endDate: row.end_date, createdAt: row.created_at })
  );
  if (current.length === 0) return { byGroup: {}, overall: "none" };

  const groupIdByAssignment: Record<string, string> = {};
  const totalByGroup: Record<string, number> = {};
  for (const row of current) {
    groupIdByAssignment[row.id] = row.group_id;
    totalByGroup[row.group_id] = (totalByGroup[row.group_id] ?? 0) + row.assignment_books.length;
  }

  const assignmentIds = current.map((row) => row.id);
  const { data: completionRows } = await supabase
    .from("assignment_completion")
    .select("assignment_id, completed")
    .eq("child_id", childId)
    .in("assignment_id", assignmentIds);

  const doneByGroup: Record<string, number> = {};
  for (const row of completionRows ?? []) {
    if (!row.completed) continue;
    const groupId = groupIdByAssignment[row.assignment_id];
    if (groupId) doneByGroup[groupId] = (doneByGroup[groupId] ?? 0) + 1;
  }

  const byGroup: Record<string, HomeworkBadge> = {};
  for (const groupId of Object.keys(totalByGroup)) {
    const total = totalByGroup[groupId];
    const done = doneByGroup[groupId] ?? 0;
    byGroup[groupId] = total === 0 ? "done" : done >= total ? "done" : "pending";
  }

  const totalAll = Object.values(totalByGroup).reduce((s, n) => s + n, 0);
  const doneAll = Object.values(doneByGroup).reduce((s, n) => s + n, 0);
  const overall: HomeworkBadge = totalAll === 0 ? "done" : doneAll >= totalAll ? "done" : "pending";

  return { byGroup, overall };
}
