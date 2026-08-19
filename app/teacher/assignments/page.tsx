import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숙제</h1>
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
        <h1 className="d text-xl">숙제</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          교사 계정에서만 볼 수 있는 화면이에요.
        </p>
      </div>
    );
  }

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", user.id)
    .eq("role", "teacher")
    .eq("status", "approved");

  type GroupRow = { id: string; name: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));

  const cards: AssignmentCard[] = [];
  for (const group of groups) {
    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select("id, title, start_date, end_date")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false });

    for (const assignment of assignmentRows ?? []) {
      const { data: completionRows } = await supabase
        .from("assignment_completion")
        .select("completed")
        .eq("assignment_id", assignment.id);
      const total = completionRows?.length ?? 0;
      const completed = (completionRows ?? []).filter((row) => row.completed).length;
      cards.push({
        id: assignment.id,
        groupId: group.id,
        groupName: group.name,
        title: assignment.title,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        completed,
        total,
      });
    }
  }

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
