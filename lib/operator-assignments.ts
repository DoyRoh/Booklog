/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { operatorGroupsQuery } from "@/lib/operator-groups";

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

  // completion 뷰는 (숙제, 책, 아이) 단위라, "아이가 그 숙제의 책을 전부
  // 읽었는지"로 다시 묶어서 "N/M명 완료"로 보여준다.
  const completionByAssignment = new Map<string, { completed: number; total: number }>();
  {
    const perChild = new Map<string, Map<string, boolean>>();
    for (const row of completionRows ?? []) {
      const m = perChild.get(row.assignment_id) ?? new Map<string, boolean>();
      m.set(row.child_id, (m.get(row.child_id) ?? true) && row.completed);
      perChild.set(row.assignment_id, m);
    }
    for (const [assignmentId, m] of perChild) {
      completionByAssignment.set(assignmentId, {
        completed: Array.from(m.values()).filter(Boolean).length,
        total: m.size,
      });
    }
  }

  return (groupRows ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    cards: (group.assignments ?? [])
      .map((assignment) => {
        const stat = completionByAssignment.get(assignment.id) ?? { completed: 0, total: 0 };
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
        };
      })
      // 최근에 낸 숙제가 위.
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));
}
