import type { SupabaseClient } from "@supabase/supabase-js";
import { getSignedMediaUrl } from "@/lib/storage";
import type { TodayAssignment } from "@/components/assignment-today";

type AssignmentRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  groups: { name: string } | null;
  assignment_books: {
    target_page: number | null;
    books: { id: string; title: string; author: string | null; cover_url: string | null } | null;
  }[];
  assignment_missions: { id: string; type: TodayAssignment["missions"][number]["type"]; question: string | null }[];
};

/**
 * 오늘 탭(요약)과 /today/assignments(상세) 양쪽에서 같은 아이의 진행 중인
 * 숙제 데이터를 써야 해서, 조회 로직을 한 곳으로 뺐다.
 */
export async function getTodayAssignments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  childId: string
): Promise<TodayAssignment[]> {
  const { data: memberGroupRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("child_id", childId)
    .eq("status", "approved");

  const groupIds = (memberGroupRows ?? []).map((row) => row.group_id);
  if (groupIds.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select(
      "id, group_id, title, description, groups(name), assignment_books(target_page, books(id, title, author, cover_url)), assignment_missions(id, type, question)"
    )
    .in("group_id", groupIds)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("created_at", { ascending: false });

  const rows = (assignmentRows ?? []) as unknown as AssignmentRow[];
  if (rows.length === 0) return [];

  const assignmentIds = rows.map((row) => row.id);
  const missionIds = rows.flatMap((row) => row.assignment_missions.map((m) => m.id));
  // 완료된 숙제 책은 "읽었어요" 표시만이 아니라 실제 독서기록을 그 자리에서
  // 수정할 수 있어야 하므로, 책마다 붙는 reading_records를 미리 찾아둔다
  // (같은 책을 여러 그룹 숙제로 완독했을 수 있어 여러 개일 수 있는데, 가장
  // 최근 기록을 대표로 쓴다).
  const bookIds = Array.from(
    new Set(
      rows.flatMap((row) => row.assignment_books.map((ab) => ab.books?.id).filter((id): id is string => Boolean(id)))
    )
  );
  type CompletedRecord = {
    id: string;
    book_id: string;
    status: "reading" | "done";
    rating: number | null;
    emotion: string | null;
    favorite: boolean;
    parent_memo: string | null;
    read_date: string;
    pages_read: number | null;
  };

  // 셋 다 assignmentRows에서 뽑은 id 목록에만 의존하고 서로는 무관하므로,
  // 순서대로 기다리지 않고 한 번에 왕복한다(오늘 탭이 유독 무거웠던 이유
  // 중 하나 -- 이 세 조회가 전부 순차적이었다).
  const [{ data: completionRows }, { data: responseRows }, { data: recordRows }] = await Promise.all([
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
    bookIds.length
      ? supabase
          .from("reading_records")
          .select("id, book_id, status, rating, emotion, favorite, parent_memo, read_date, pages_read")
          .eq("child_id", childId)
          .in("status", ["done", "reading"])
          .in("book_id", bookIds)
          .order("read_date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const completedSet = new Set(
    (completionRows ?? []).filter((row) => row.completed).map((row) => `${row.assignment_id}:${row.book_id}`)
  );
  // 완료로 잡힌 책마다 대표 기록 하나를 골라 그 자리에서 수정할 수 있게
  // 한다 -- '완독' 숙제는 보통 status='done' 기록이지만, 부분 읽기(target_page)
  // 숙제는 status='reading' 기록으로도 완료 처리되므로 done을 우선하되
  // 없으면 가장 최근 reading 기록을 쓴다.
  const recordByBook = new Map<string, CompletedRecord>();
  for (const record of (recordRows ?? []) as CompletedRecord[]) {
    const existing = recordByBook.get(record.book_id);
    if (!existing || (existing.status !== "done" && record.status === "done")) {
      recordByBook.set(record.book_id, record);
    }
  }
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

  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: row.groups?.name ?? "",
    title: row.title,
    description: row.description,
    books: row.assignment_books
      .filter(
        (ab): ab is typeof ab & { books: { id: string; title: string; author: string | null; cover_url: string | null } } =>
          Boolean(ab.books)
      )
      .map((ab) => {
        const book = ab.books;
        const record = recordByBook.get(book.id) ?? null;
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.cover_url,
          completed: completedSet.has(`${row.id}:${book.id}`),
          targetPage: ab.target_page,
          recordId: record?.id ?? null,
          status: record?.status ?? null,
          rating: record?.rating ?? null,
          emotion: record?.emotion ?? null,
          favorite: record?.favorite ?? false,
          memo: record?.parent_memo ?? null,
          readDate: record?.read_date ?? null,
          pagesRead: record?.pages_read ?? null,
        };
      }),
    missions: row.assignment_missions.map((mission) => ({
      id: mission.id,
      type: mission.type,
      question: mission.question,
      answerText: answerByMission.get(mission.id) ?? null,
      voiceSignedUrl: voiceSignedUrlByMission.get(mission.id) ?? null,
    })),
  }));
}
