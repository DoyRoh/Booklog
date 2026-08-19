import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { getSignedMediaUrl } from "@/lib/storage";
import AssignmentToday, { type TodayAssignment } from "@/components/assignment-today";
import RecentRecords, { type RecentRecord } from "@/components/recent-records";

type AssignmentRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  groups: { name: string } | null;
  assignment_books: { books: { id: string; title: string; cover_url: string | null } | null }[];
  assignment_missions: { id: string; type: TodayAssignment["missions"][number]["type"]; question: string | null }[];
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">오늘</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent") {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">오늘</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          {profile?.role === "teacher"
            ? "교사 대시보드에서 반의 숙제 진행 상황을 볼 수 있어요."
            : "큐레이터 대시보드에서 발행한 리스트를 관리할 수 있어요."}
        </p>
        <Link
          href={profile?.role === "teacher" ? "/teacher" : "/curator"}
          className="d mt-2 inline-block text-sm"
          style={{ color: "var(--point)" }}
        >
          대시보드로 가기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, user.id);

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">오늘</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 오늘의 숙제가 여기에 표시돼요. 더보기 탭에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const { data: allRecords } = await supabase
    .from("reading_records")
    .select("id, status, rating, emotion, favorite, parent_memo, read_date, books(title, author, cover_url)")
    .eq("child_id", activeChild.id)
    .order("read_date", { ascending: false });

  const doneRecords = (allRecords ?? []).filter((r) => r.status === "done");
  const totalDone = doneRecords.length;
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const monthCount = doneRecords.filter((r) => r.read_date.startsWith(thisMonthKey)).length;

  const uniqDates = Array.from(new Set(doneRecords.map((r) => r.read_date))).sort();
  let run = 0;
  let bestStreak = 0;
  let prevTime: number | null = null;
  for (const d of uniqDates) {
    const t = new Date(`${d}T00:00:00`).getTime();
    run = prevTime !== null && t - prevTime === 86400000 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prevTime = t;
  }

  const recentRecords: RecentRecord[] = (allRecords ?? []).slice(0, 5).map((r) => {
    const book = r.books as unknown as {
      title: string;
      author: string | null;
      cover_url: string | null;
    } | null;
    return {
      id: r.id,
      title: book?.title ?? "",
      author: book?.author ?? null,
      coverUrl: book?.cover_url ?? null,
      status: r.status,
      rating: r.rating,
      emotion: r.emotion,
      favorite: r.favorite,
      memo: r.parent_memo ?? "",
      readDate: r.read_date,
    };
  });

  const { data: memberGroupRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("child_id", activeChild.id)
    .eq("status", "approved");

  const groupIds = (memberGroupRows ?? []).map((row) => row.group_id);

  const today = new Date().toISOString().slice(0, 10);
  let assignments: TodayAssignment[] = [];

  if (groupIds.length > 0) {
    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select(
        "id, group_id, title, description, groups(name), assignment_books(books(id, title, cover_url)), assignment_missions(id, type, question)"
      )
      .in("group_id", groupIds)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("created_at", { ascending: false });

    const rows = (assignmentRows ?? []) as unknown as AssignmentRow[];
    const assignmentIds = rows.map((row) => row.id);
    const missionIds = rows.flatMap((row) => row.assignment_missions.map((m) => m.id));

    const { data: completionRows } = assignmentIds.length
      ? await supabase
          .from("assignment_completion")
          .select("assignment_id, book_id, completed")
          .eq("child_id", activeChild.id)
          .in("assignment_id", assignmentIds)
      : { data: [] };

    const { data: responseRows } = missionIds.length
      ? await supabase
          .from("assignment_mission_responses")
          .select("mission_id, answer_text, voice_url")
          .eq("child_id", activeChild.id)
          .in("mission_id", missionIds)
      : { data: [] };

    const completedSet = new Set(
      (completionRows ?? []).filter((row) => row.completed).map((row) => `${row.assignment_id}:${row.book_id}`)
    );
    const answerByMission = new Map(
      (responseRows ?? []).map((row) => [row.mission_id, row.answer_text as string | null])
    );
    const voiceUrlByMission = new Map(
      (responseRows ?? []).map((row) => [row.mission_id, row.voice_url as string | null])
    );
    const voiceSignedUrlByMission = new Map<string, string | null>(
      await Promise.all(
        Array.from(voiceUrlByMission.entries()).map(async ([missionId, voiceUrl]) => [
          missionId,
          voiceUrl ? await getSignedMediaUrl(supabase, voiceUrl) : null,
        ] as const)
      )
    );

    assignments = rows.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      groupName: row.groups?.name ?? "",
      title: row.title,
      description: row.description,
      books: row.assignment_books
        .map((ab) => ab.books)
        .filter((book): book is { id: string; title: string; cover_url: string | null } => Boolean(book))
        .map((book) => ({
          id: book.id,
          title: book.title,
          coverUrl: book.cover_url,
          completed: completedSet.has(`${row.id}:${book.id}`),
        })),
      missions: row.assignment_missions.map((mission) => ({
        id: mission.id,
        type: mission.type,
        question: mission.question,
        answerText: answerByMission.get(mission.id) ?? null,
        voiceSignedUrl: voiceSignedUrlByMission.get(mission.id) ?? null,
      })),
    }));
  }

  const voiceAllowed = await hasVoiceConsent(supabase, user.id);

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <h1 className="d text-xl">오늘</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        {activeChild.name}, 오늘도 책숲을 걸어볼까요?
      </p>

      <div
        className="mt-4 flex items-center justify-around rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="d text-xl" style={{ color: "var(--point-deep)" }}>
            {totalDone}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            읽은 책
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="d text-xl">{monthCount}</span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            이번 달
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="d text-xl">{bestStreak}</span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            최장 연속
          </span>
        </div>
      </div>

      {assignments.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          지금 진행 중인 숙제가 없어요. 책장에서 자유롭게 책을 기록해 보세요.
        </p>
      ) : (
        <AssignmentToday childId={activeChild.id} assignments={assignments} voiceAllowed={voiceAllowed} />
      )}

      {recentRecords.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <p className="d text-lg">최근 기록</p>
            <Link href="/records" className="text-xs" style={{ color: "var(--ink-2)" }}>
              전체 보기 ›
            </Link>
          </div>
          <div className="mt-3">
            <RecentRecords records={recentRecords} />
          </div>
        </div>
      )}
    </div>
  );
}
