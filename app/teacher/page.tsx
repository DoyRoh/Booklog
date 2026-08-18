import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const TYPE_LABELS: Record<string, string> = {
  kindergarten: "유치원",
  school: "학교",
  library: "도서관",
  family: "가족",
  community: "커뮤니티",
  creator: "크리에이터",
};

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">교사 대시보드</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (profile?.role !== "teacher") {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">교사 대시보드</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          교사 계정에서만 볼 수 있는 화면이에요.
        </p>
      </div>
    );
  }

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name, type)")
    .eq("user_id", user.id)
    .eq("role", "teacher")
    .eq("status", "approved");

  type GroupRow = { id: string; name: string; type: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));

  const cards: GroupCard[] = [];
  for (const group of groups) {
    const { count: memberCount } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("status", "approved")
      .not("child_id", "is", null);

    const { count: pendingCount } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("status", "pending");

    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select("id, title")
      .eq("group_id", group.id);

    const assignmentProgress: GroupCard["assignmentProgress"] = [];
    for (const assignment of assignmentRows ?? []) {
      const { data: completionRows } = await supabase
        .from("assignment_completion")
        .select("completed")
        .eq("assignment_id", assignment.id);
      const total = completionRows?.length ?? 0;
      const completed = (completionRows ?? []).filter((row) => row.completed).length;
      assignmentProgress.push({ title: assignment.title, completed, total });
    }

    cards.push({
      id: group.id,
      name: group.name,
      type: group.type,
      memberCount: memberCount ?? 0,
      pendingCount: pendingCount ?? 0,
      assignmentProgress,
    });
  }

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <p className="text-xs" style={{ color: "var(--lantern)" }}>
        곰이 등불을 들고 반 아이들의 길을 비추고 있어요
      </p>
      <h1 className="d mt-1 text-xl">교사 대시보드</h1>

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
                    {TYPE_LABELS[card.type] ?? card.type}
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
