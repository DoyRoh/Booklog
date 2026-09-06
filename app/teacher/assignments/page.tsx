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
    .in("role", ["teacher", "admin"])
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
    ? await supabase.from("assignment_completion").select("assignment_id, completed").in("assignment_id", assignmentIds)
    : { data: [] };

  const completionByAssignment = new Map<string, { completed: number; total: number }>();
  for (const row of completionRows ?? []) {
    const stat = completionByAssignment.get(row.assignment_id) ?? { completed: 0, total: 0 };
    stat.total++;
    if (row.completed) stat.completed++;
    completionByAssignment.set(row.assignment_id, stat);
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
        운영 중인 모든 그룹의 숙제를 한눈에 볼 수 있어요.
      </p>

      {cards.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 만든 숙제가 없어요. 그룹 상세 화면에서 &ldquo;+ 숙제 만들기&rdquo;로 시작해 보세요.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {cards.map((card) => (
            <Link
              key={card.id}
              href={`/recommend/${card.groupId}`}
              className="block rounded-[var(--r)] border p-4"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              <p className="text-xs" style={{ color: "var(--lantern)" }}>
                {card.groupName}
              </p>
              <p className="d mt-0.5 text-sm">{card.title}</p>
              {(card.startDate || card.endDate) && (
                <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
                  {card.startDate ?? "~"} ~ {card.endDate ?? ""}
                </p>
              )}
              <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
                완료 {card.completed}/{card.total}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
