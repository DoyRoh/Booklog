import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";

type AssignmentCard = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  completed: number;
  total: number;
};

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숙제</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // "교사 계정"이라는 고정된 역할 대신, 실제로 운영진으로 승인된 그룹이
  // 있는지로 판단한다(계정 하나가 아이 프로필과 선생님 프로필을 동시에
  // 가질 수 있음). 그룹이 하나도 없으면 아래 "아직 만든 숙제가 없어요"
  // 안내가 그대로 자연스럽게 뜬다.
  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin", "curator"])
    .eq("status", "approved");

  type GroupRow = { id: string; name: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const groupIds = groups.map((g) => g.id);
  const groupById = new Map(groups.map((g) => [g.id, g]));

  // 그룹마다, 그리고 숙제마다 따로 물어보던 걸(N+1) 한 번씩만 물어보고
  // 자바스크립트에서 묶는 방식으로 바꿨다.
  const { data: assignmentRows } = groupIds.length
    ? await supabase
        .from("assignments")
        .select("id, group_id, title, start_date, end_date")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const assignmentIds = (assignmentRows ?? []).map((a) => a.id);
  const { data: completionRows } = assignmentIds.length
    ? await supabase
        .from("assignment_completion")
        .select("assignment_id, child_id, completed")
        .in("assignment_id", assignmentIds)
    : { data: [] };

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

  const cards: AssignmentCard[] = (assignmentRows ?? []).map((assignment) => {
    const stat = completionByAssignment.get(assignment.id) ?? { completed: 0, total: 0 };
    return {
      id: assignment.id,
      groupId: assignment.group_id,
      groupName: groupById.get(assignment.group_id)?.name ?? "",
      title: assignment.title,
      startDate: assignment.start_date,
      endDate: assignment.end_date,
      completed: stat.completed,
      total: stat.total,
    };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <h1 className="d text-xl">숙제</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        추천도서 서랍에서 골라 기간을 정해 낸 숙제예요. 숙제마다 몇 명이 끝냈는지 보이고, 누르면 아이별로 자세히
        보여요.
      </p>

      {groups.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map((group) => {
            const groupCards = cards.filter((c) => c.groupId === group.id);
            return (
              <div key={group.id}>
                <div className="flex items-center justify-between">
                  <p className="d text-sm">{group.name}</p>
                  <Link href={`/recommend/${group.id}#assignment`} className="text-xs" style={{ color: "var(--point)" }}>
                    + 숙제 만들기
                  </Link>
                </div>
                {groupCards.length === 0 ? (
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                    아직 낸 숙제가 없어요.
                  </p>
                ) : (
                  <div
                    className="mt-2 overflow-hidden rounded-[var(--r)] border"
                    style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                  >
                    {groupCards.map((card, index) => {
                      const allDone = card.total > 0 && card.completed === card.total;
                      return (
                        <Link
                          key={card.id}
                          href={`/teacher/assignments/${card.id}`}
                          className="flex items-center gap-3 px-3 py-3"
                          style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="d truncate text-sm">{card.title}</p>
                            {(card.startDate || card.endDate) && (
                              <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
                                {card.startDate ?? ""} ~ {card.endDate ?? ""}
                              </p>
                            )}
                          </div>
                          <span
                            className="d flex-none rounded-full px-2 py-0.5 text-xs"
                            style={{
                              background: allDone ? "rgba(47,168,79,0.12)" : "var(--paper)",
                              color: allDone ? "var(--point-deep)" : "var(--ink-2)",
                            }}
                          >
                            {card.completed}/{card.total}명 완료
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
