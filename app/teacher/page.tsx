import Link from "next/link";
import Illustration from "@/components/illustration";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";

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
        <h1 className="d text-xl">교사 대시보드</h1>
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
  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name, type)")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin"])
    .eq("status", "approved");

  type GroupRow = { id: string; name: string; type: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const groupIds = groups.map((g) => g.id);

  // 그룹마다 멤버수/승인대기/숙제/완료현황을 따로따로 물어보던 걸(N+1),
  // 그룹 id 목록으로 한 번씩만 물어보고 자바스크립트에서 그룹별로 묶는
  // 방식으로 바꿨다 -- 그룹이 몇 개든 왕복 횟수는 그대로다.
  const [{ data: memberRows }, { data: pendingRows }, { data: assignmentRows }] = groupIds.length
    ? await Promise.all([
        supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", groupIds)
          .eq("status", "approved")
          .not("child_id", "is", null),
        supabase.from("group_members").select("group_id").in("group_id", groupIds).eq("status", "pending"),
        supabase.from("assignments").select("id, group_id, title").in("group_id", groupIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const assignmentIds = (assignmentRows ?? []).map((a) => a.id);
  const { data: completionRows } = assignmentIds.length
    ? await supabase.from("assignment_completion").select("assignment_id, completed").in("assignment_id", assignmentIds)
    : { data: [] };

  const memberCountByGroup = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountByGroup.set(row.group_id, (memberCountByGroup.get(row.group_id) ?? 0) + 1);
  }
  const pendingCountByGroup = new Map<string, number>();
  for (const row of pendingRows ?? []) {
    pendingCountByGroup.set(row.group_id, (pendingCountByGroup.get(row.group_id) ?? 0) + 1);
  }
  const completionByAssignment = new Map<string, { completed: number; total: number }>();
  for (const row of completionRows ?? []) {
    const stat = completionByAssignment.get(row.assignment_id) ?? { completed: 0, total: 0 };
    stat.total++;
    if (row.completed) stat.completed++;
    completionByAssignment.set(row.assignment_id, stat);
  }

  const cards: GroupCard[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    memberCount: memberCountByGroup.get(group.id) ?? 0,
    pendingCount: pendingCountByGroup.get(group.id) ?? 0,
    assignmentProgress: (assignmentRows ?? [])
      .filter((a) => a.group_id === group.id)
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
            곰이 등불을 들고 반 아이들의 길을 비추고 있어요
          </p>
          <h1 className="d mt-1 text-xl">교사 대시보드</h1>
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
                <span>멤버 {card.memberCount}명</span>
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
                        완료 {assignment.completed}/{assignment.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
