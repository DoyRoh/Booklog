import Link from "next/link";
import Illustration from "@/components/illustration";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import { operatorGroupsQuery } from "@/lib/operator-groups";

type GroupCard = {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  pendingCount: number;
  assignmentProgress: { title: string; completed: number; total: number }[];
};

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숲지기 대시보드</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // "교사 계정"이라는 고정된 역할 대신, 실제로 교사/운영진으로 승인된
  // 그룹이 있는지로 이 화면을 볼 수 있는지 정한다 -- 계정 하나가 아이
  // 프로필과 선생님 프로필을 동시에 가질 수 있어서, users.role 하나로는
  // 더 이상 판단할 수 없다.
  // 운영 그룹 + 그룹원 + 숙제를 임베드 한 번으로, 완료 현황은 나란히.
  type GroupRow = {
    id: string;
    name: string;
    type: string;
    members: { child_id: string | null; status: string }[] | null;
    assignments: { id: string; title: string }[] | null;
  };
  const [{ data: groupRows }, { data: completionRows }] = await Promise.all([
    operatorGroupsQuery(supabase, userId, "members:group_members(child_id, status), assignments(id, title)").overrideTypes<
      GroupRow[],
      { merge: false }
    >(),
    // security_invoker 뷰라 RLS상 내가 볼 수 있는 숙제 행만 온다.
    supabase.from("assignment_completion").select("assignment_id, child_id, completed"),
  ]);
  const groups = groupRows ?? [];

  // (숙제, 책, 아이) 단위 행을 "아이가 그 숙제를 다 끝냈는지"로 묶어 명 단위로.
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

  const cards: GroupCard[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    memberCount: (group.members ?? []).filter((m) => m.status === "approved" && m.child_id).length,
    pendingCount: (group.members ?? []).filter((m) => m.status === "pending").length,
    assignmentProgress: (group.assignments ?? [])
      .map((a) => {
        const stat = completionByAssignment.get(a.id) ?? { completed: 0, total: 0 };
        return { title: a.title, completed: stat.completed, total: stat.total };
      }),
  }));

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: "var(--lantern)" }}>
            등불을 들고 아이들의 길을 비추는 숲지기
          </p>
          <h1 className="d mt-1 text-xl">숲지기 대시보드</h1>
        </div>
        <Illustration name="bear-lantern" height={72} className="flex-none" />
      </div>

      {cards.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 운영하는 그룹이 없어요.
          </p>
          <Link href="/recommend/create" className="d mt-2 inline-block text-sm" style={{ color: "var(--point)" }}>
            + 그룹 만들기
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-[var(--r)] border p-4"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="d text-sm">{card.name}</p>
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {GROUP_TYPE_LABELS[card.type] ?? card.type}
                  </p>
                </div>
                <Link href={`/recommend/${card.id}`} className="text-xs" style={{ color: "var(--point)" }}>
                  관리하기
                </Link>
              </div>

              <div className="mt-3 flex gap-4 text-xs" style={{ color: "var(--ink-2)" }}>
                <span>아이 {card.memberCount}명</span>
                {card.pendingCount > 0 && (
                  <span style={{ color: "var(--lantern)" }}>승인 대기 {card.pendingCount}건</span>
                )}
              </div>

              {card.assignmentProgress.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {card.assignmentProgress.map((assignment) => (
                    <div key={assignment.title} className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--ink)" }}>{assignment.title}</span>
                      <span style={{ color: "var(--ink-2)" }}>
                        {assignment.completed}/{assignment.total}명 완료
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link
            href="/recommend/create"
            className="d flex items-center justify-center rounded-[var(--r)] border border-dashed px-4 py-3 text-sm"
            style={{ borderColor: "rgba(38,54,43,0.28)", color: "var(--ink-2)" }}
          >
            + 새 그룹 만들기 (예: 6살 추천도서)
          </Link>
        </div>
      )}
    </div>
  );
}
