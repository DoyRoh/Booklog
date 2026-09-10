import Link from "next/link";
import { periodLabel } from "@/lib/assignment-period";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { AvatarIllustration } from "@/components/illustration";

type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null };

// 숙제 하나를 아이별로: 책마다 읽었는지, 질문에 뭐라고 답했는지, 낭독을
// 남겼는지. 숙제 탭에서 숙제를 눌렀을 때.
export default async function TeacherAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href="/teacher/assignments" className="text-sm" style={{ color: "var(--point)" }}>
          ← 숙제
        </Link>
      </div>
    );
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, group_id, title, description, start_date, end_date, created_at, groups(name), assignment_books(book_id, target_page, books(title, cover_url)), assignment_missions(id, type, question)"
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href="/teacher/assignments" className="text-sm" style={{ color: "var(--ink-2)" }}>
          ← 숙제
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          숙제를 찾을 수 없어요.
        </p>
      </div>
    );
  }

  const group = assignment.groups as unknown as { name: string } | null;
  const books = ((assignment.assignment_books as unknown as {
    book_id: string;
    target_page: number | null;
    books: { title: string; cover_url: string | null } | null;
  }[]) ?? []);
  const missions = ((assignment.assignment_missions as unknown as { id: string; type: string; question: string | null }[]) ?? []);
  const missionIds = missions.map((m) => m.id);

  const [{ data: memberRows }, { data: completionRows }, { data: responseRows }] = await Promise.all([
    supabase
      .from("group_members")
      .select("children(id, name, avatar)")
      .eq("group_id", assignment.group_id)
      .eq("status", "approved")
      .not("child_id", "is", null),
    supabase.from("assignment_completion").select("child_id, book_id, completed").eq("assignment_id", assignmentId),
    missionIds.length
      ? supabase
          .from("assignment_mission_responses")
          .select("mission_id, child_id, answer_text, voice_url")
          .in("mission_id", missionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const children = (memberRows ?? [])
    .map((row) => row.children as unknown as ChildRow | null)
    .filter((c): c is ChildRow => Boolean(c));
  const completed = new Set((completionRows ?? []).filter((r) => r.completed).map((r) => `${r.child_id}:${r.book_id}`));
  const responseByKey = new Map((responseRows ?? []).map((r) => [`${r.child_id}:${r.mission_id}`, r]));

  const rows = children
    .map((child) => {
      const done = books.filter((b) => completed.has(`${child.id}:${b.book_id}`)).length;
      return { child, done, allDone: books.length > 0 && done === books.length };
    })
    .sort((a, b) => Number(b.allDone) - Number(a.allDone) || b.done - a.done);
  const doneChildren = rows.filter((r) => r.allDone).length;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/teacher/assignments" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 숙제
      </Link>

      <p className="mt-3 text-xs" style={{ color: "var(--lantern)" }}>
        {group?.name}
      </p>
      <h1 className="d text-xl">{assignment.title}</h1>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {periodLabel({ startDate: assignment.start_date, endDate: assignment.end_date, createdAt: assignment.created_at })}
      </p>
      {assignment.description && (
        <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
          {assignment.description}
        </p>
      )}

      <div
        className="mt-4 rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <p className="d text-2xl">
          {doneChildren} <span className="text-base font-normal">/ {children.length}명 완료</span>
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {books.map((b) => (
            <div key={b.book_id} className="flex items-center justify-between text-xs">
              <span>
                {b.books?.title ?? "책"}
                {b.target_page ? <span style={{ color: "var(--ink-2)" }}> · {b.target_page}쪽까지</span> : null}
              </span>
              <span style={{ color: "var(--ink-2)" }}>
                {children.filter((c) => completed.has(`${c.id}:${b.book_id}`)).length}명 읽음
              </span>
            </div>
          ))}
          {missions.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--ink-2)" }}>
                {m.type === "voice" ? "낭독" : "질문"}
                {m.question ? ` · ${m.question}` : ""}
              </span>
              <span style={{ color: "var(--ink-2)" }}>
                {children.filter((c) => {
                  const r = responseByKey.get(`${c.id}:${m.id}`);
                  return m.type === "voice" ? Boolean(r?.voice_url) : Boolean(r?.answer_text?.trim());
                }).length}
                명 제출
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="d text-base">아이별</p>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 승인된 아이가 없어요.
          </p>
        ) : (
          <div
            className="mt-3 overflow-hidden rounded-[var(--r)] border"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            {rows.map(({ child, done, allDone }, index) => (
              <div
                key={child.id}
                className="px-3 py-3"
                style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
              >
                <Link href={`/teacher/children/${child.id}?group=${assignment.group_id}`} className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    style={{ background: "var(--paper)" }}
                  >
                    <AvatarIllustration avatar={child.avatar} height={28} />
                  </div>
                  <p className="flex-1 text-sm">{child.name}</p>
                  <span
                    className="d flex-none rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: allDone ? "rgba(47,168,79,0.12)" : "var(--paper)",
                      color: allDone ? "var(--point-deep)" : "var(--ink-2)",
                    }}
                  >
                    {done}/{books.length}
                  </span>
                </Link>
                {missions.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 pl-12">
                    {missions.map((m) => {
                      const r = responseByKey.get(`${child.id}:${m.id}`);
                      const text =
                        m.type === "voice"
                          ? r?.voice_url
                            ? "녹음을 남겼어요"
                            : "아직 녹음 전"
                          : r?.answer_text?.trim() || "아직 답하지 않았어요";
                      const has = m.type === "voice" ? Boolean(r?.voice_url) : Boolean(r?.answer_text?.trim());
                      return (
                        <p key={m.id} className="text-xs" style={{ color: has ? "var(--ink)" : "var(--ink-2)" }}>
                          {m.type === "voice" ? "낭독 · " : "답 · "}
                          {text}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
