/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { operatorGroupsQuery } from "@/lib/operator-groups";

export type OperatorAssignmentChildStatus = { childId: string; name: string; done: boolean };

export type OperatorAssignmentCard = {
  id: string;
  title: string;
  description: string | null;
  bookTitles: string[];
  missions: { type: string }[];
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  completed: number;
  total: number;
  /** 아이별 완료 여부(이름순) -- 내보내기 표에서 "누가 아직 안 했는지" 바로 보이게. */
  children: OperatorAssignmentChildStatus[];
};

export type OperatorAssignmentSection = { id: string; name: string; cards: OperatorAssignmentCard[] };

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  assignment_books: { books: { title: string } | null }[] | null;
  assignment_missions: { type: string }[] | null;
};
type GroupRow = { id: string; name: string; assignments: AssignmentRow[] | null };

/**
 * 숲지기가 운영하는 그룹별 숙제(+책 제목·미션·완료 인원)를 임베드 한 번으로.
 * 숙제 탭과 내보내기 화면이 같이 쓴다.
 */
export async function loadOperatorAssignmentSections(
  supabase: SupabaseClient<any>,
  userId: string
): Promise<OperatorAssignmentSection[]> {
  const [{ data: groupRows }, { data: completionRows }] = await Promise.all([
    operatorGroupsQuery(
      supabase,
      userId,
      "assignments(id, title, description, start_date, end_date, created_at, assignment_books(books(title)), assignment_missions(type))"
    ).overrideTypes<GroupRow[], { merge: false }>(),
    // security_invoker 뷰라 RLS상 내가 볼 수 있는 숙제 행만 온다.
    supabase.from("assignment_completion").select("assignment_id, child_id, completed"),
  ]);

  // 아이 이름 -- 내보내기 표에서 "누가 아직 안 했는지" 이름으로 바로
  // 보여 달라는 요청으로, completion 뷰의 child_id를 이름으로 바꾼다.
  const groupIds = (groupRows ?? []).map((g) => g.id);
  const { data: memberRows } = groupIds.length
    ? await supabase
        .from("group_members")
        .select("child_id, children(name)")
        .in("group_id", groupIds)
        .eq("status", "approved")
        .not("child_id", "is", null)
    : { data: [] as { child_id: string | null; children: { name: string } | null }[] };
  const childName = new Map<string, string>();
  for (const row of (memberRows ?? []) as unknown as { child_id: string | null; children: { name: string } | null }[]) {
    if (row.child_id && row.children?.name) childName.set(row.child_id, row.children.name);
  }

  // completion 뷰는 (숙제, 책, 아이) 단위라, "아이가 그 숙제의 책을 전부
  // 읽었는지"로 다시 묶어서 "N/M명 완료" + 아이별 완료 여부로 보여준다.
  const completionByAssignment = new Map<
    string,
    { completed: number; total: number; children: OperatorAssignmentChildStatus[] }
  >();
  {
    const perChild = new Map<string, Map<string, boolean>>();
    for (const row of completionRows ?? []) {
      const m = perChild.get(row.assignment_id) ?? new Map<string, boolean>();
      m.set(row.child_id, (m.get(row.child_id) ?? true) && row.completed);
      perChild.set(row.assignment_id, m);
    }
    for (const [assignmentId, m] of perChild) {
      const children = Array.from(m.entries())
        .map(([childId, done]) => ({ childId, name: childName.get(childId) ?? "이름 없음", done }))
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
      completionByAssignment.set(assignmentId, {
        completed: children.filter((c) => c.done).length,
        total: children.length,
        children,
      });
    }
  }

  return (groupRows ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    cards: (group.assignments ?? [])
      .map((assignment) => {
        const stat = completionByAssignment.get(assignment.id) ?? { completed: 0, total: 0, children: [] };
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          bookTitles: (assignment.assignment_books ?? [])
            .map((ab) => ab.books?.title)
            .filter((t): t is string => Boolean(t)),
          missions: assignment.assignment_missions ?? [],
          startDate: assignment.start_date,
          endDate: assignment.end_date,
          createdAt: assignment.created_at,
          completed: stat.completed,
          total: stat.total,
          children: stat.children,
        };
      })
      // 최근에 낸 숙제가 위.
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));
}
