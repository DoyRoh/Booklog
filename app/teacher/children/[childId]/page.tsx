import Link from "next/link";
import { periodLabel } from "@/lib/assignment-period";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getRecommendBooks } from "@/lib/recommend-books";
import Section from "@/components/section";
import Illustration, { AvatarIllustration, PawStamp } from "@/components/illustration";

type AssignmentRow = {
  id: string;
  title: string;
  start_date: string | null;
  created_at: string;
  end_date: string | null;
  assignment_books: { book_id: string; target_page: number | null; books: { title: string } | null }[] | null;
  assignment_missions: { id: string; type: string; question: string | null }[] | null;
};

// 숲지기가 보는 아이 한 명의 상세: 그 그룹의 추천도서를 책마다 어디까지
// 읽었는지, 숙제마다 어떤 책을 끝냈고 질문에 뭐라고 답했는지. 사진·음성은
// 애초에 숲지기에게 보이지 않는다(RLS) -- 여기서도 조회하지 않는다.
export default async function TeacherChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { childId } = await params;
  const { group: groupId } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId || !groupId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href={groupId ? `/teacher/children?group=${groupId}` : "/teacher/children"} className="text-sm" style={{ color: "var(--point)" }}>
          ← 아이들
        </Link>
      </div>
    );
  }

  // 이 그룹의 운영진인지 먼저 확인한다(아니면 RLS가 어차피 빈 결과를 주지만,
  // 화면에 "없어요"가 아니라 명확한 안내를 띄우기 위해).
  const [{ data: membership }, { data: group }, { data: child }] = await Promise.all([
    supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .in("role", ["teacher", "admin", "curator"])
      .maybeSingle(),
    supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
    supabase.from("children").select("id, name, avatar").eq("id", childId).maybeSingle(),
  ]);

  if (!membership || !group || !child) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href={`/teacher/children?group=${groupId}`} className="text-sm" style={{ color: "var(--ink-2)" }}>
          ← 아이들
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          이 그룹의 아이 정보를 볼 수 없어요.
        </p>
      </div>
    );
  }

  const avatar = child.avatar as "rabbit" | "dog" | "cat" | null;

  const [{ books }, { data: assignmentRows }] = await Promise.all([
    getRecommendBooks(supabase, groupId, childId),
    supabase
      .from("assignments")
      .select(
        "id, title, start_date, end_date, created_at, assignment_books(book_id, target_page, books(title)), assignment_missions(id, type, question)"
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
  ]);

  const assignments = (assignmentRows ?? []) as unknown as AssignmentRow[];
  const assignmentIds = assignments.map((a) => a.id);
  const missionIds = assignments.flatMap((a) => (a.assignment_missions ?? []).map((m) => m.id));

  const [{ data: completionRows }, { data: responseRows }] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("assignment_completion")
          .select("assignment_id, book_id, completed")
          .eq("child_id", childId)
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] }),
    missionIds.length
      ? supabase
          .from("assignment_mission_responses")
          .select("mission_id, answer_text, voice_url")
          .eq("child_id", childId)
          .in("mission_id", missionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const completedKey = new Set(
    (completionRows ?? []).filter((r) => r.completed).map((r) => `${r.assignment_id}:${r.book_id}`)
  );
  const responseByMission = new Map((responseRows ?? []).map((r) => [r.mission_id, r]));

  const readCount = books.filter((b) => b.readStatus === "done").length;
  const STATUS_LABEL = { done: "읽었어요", reading: "읽는 중", want: "읽고 싶어요" } as const;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href={`/teacher/children?group=${groupId}`} className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 아이들
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <div
          className="flex h-14 w-14 flex-none items-center justify-center rounded-full"
          style={{ background: "var(--card)", boxShadow: "0 0 0 1.5px var(--rule)" }}
        >
          <AvatarIllustration avatar={avatar} height={44} />
        </div>
        <div>
          <h1 className="d text-xl">{child.name}</h1>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {group.name}
          </p>
        </div>
      </div>

      {/* 추천도서: 책마다 이 아이의 읽기 상태 */}
      <Section
        className="mt-5"
        title="추천도서"
        flush={books.length > 0}
        action={
          <span className="d text-sm" style={{ color: "var(--ink-2)" }}>
            {readCount} / {books.length}권 읽음
          </span>
        }
      >
        {books.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 추천도서가 없어요.
          </p>
        ) : (
          <div>
            {books.map((book, index) => (
              <div
                key={book.itemId}
                className="flex items-center gap-3 px-[24px] py-[10px]"
                style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
              >
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" className="h-11 w-8 flex-none rounded object-cover" />
                ) : (
                  <div className="h-11 w-8 flex-none rounded" style={{ background: "var(--paper)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{book.title}</p>
                  {book.inAssignment && (
                    <span
                      className="mt-0.5 inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-2 text-[10px]"
                      style={{ background: "rgba(232,163,61,0.16)", color: "var(--lantern)" }}
                    >
                      <Illustration name="lantern-on" height={14} />
                      숙제 중
                    </span>
                  )}
                </div>
                {book.readStatus === "done" ? (
                  <span className="d flex flex-none items-center gap-1 text-xs" style={{ color: "var(--point-deep)" }}>
                    <PawStamp avatar={avatar} height={20} />
                    읽었어요
                  </span>
                ) : (
                  <span
                    className="flex-none text-xs"
                    style={{ color: book.readStatus ? "var(--lantern)" : "var(--ink-2)" }}
                  >
                    {book.readStatus ? STATUS_LABEL[book.readStatus] : "아직"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 숙제: 숙제마다 책별 완료 + 질문 답 */}
      <Section className="mt-5" title="숙제" flush={assignments.length > 0}>
        {assignments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 낸 숙제가 없어요.
          </p>
        ) : (
          <div>
            {assignments.map((assignment, index) => {
              const abooks = assignment.assignment_books ?? [];
              const done = abooks.filter((b) => completedKey.has(`${assignment.id}:${b.book_id}`)).length;
              const allDone = abooks.length > 0 && done === abooks.length;
              return (
                <div
                  key={assignment.id}
                  className="px-[24px] py-[14px]"
                  style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="d truncate text-sm">{assignment.title}</p>
                      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                        {periodLabel({ startDate: assignment.start_date, endDate: assignment.end_date, createdAt: assignment.created_at })}
                      </p>
                    </div>
                    <span
                      className="d flex-none rounded-full px-2 py-0.5 text-xs"
                      style={{
                        background: allDone ? "rgba(47,168,79,0.12)" : "var(--paper)",
                        color: allDone ? "var(--point-deep)" : "var(--ink-2)",
                      }}
                    >
                      {done}/{abooks.length} 완료
                    </span>
                  </div>

                  {abooks.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {abooks.map((b) => {
                        const ok = completedKey.has(`${assignment.id}:${b.book_id}`);
                        return (
                          <div key={b.book_id} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--ink)" }}>
                              {b.books?.title ?? "책"}
                              {b.target_page ? (
                                <span style={{ color: "var(--ink-2)" }}> · {b.target_page}쪽까지</span>
                              ) : null}
                            </span>
                            <span style={{ color: ok ? "var(--point-deep)" : "var(--ink-2)" }}>
                              {ok ? "읽었어요" : "아직"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(assignment.assignment_missions ?? []).map((m) => {
                    const r = responseByMission.get(m.id);
                    return (
                      <div
                        key={m.id}
                        className="mt-2 rounded-[10px] px-3 py-2 text-xs"
                        style={{ background: "var(--paper)" }}
                      >
                        <p style={{ color: "var(--ink-2)" }}>
                          {m.type === "voice" ? "낭독" : "질문"}
                          {m.question ? ` · ${m.question}` : ""}
                        </p>
                        <p className="mt-1" style={{ color: r ? "var(--ink)" : "var(--ink-2)" }}>
                          {m.type === "voice"
                            ? r?.voice_url
                              ? "녹음을 남겼어요"
                              : "아직 녹음 전이에요"
                            : r?.answer_text?.trim()
                              ? r.answer_text
                              : "아직 답하지 않았어요"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
