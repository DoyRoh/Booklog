import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBadges, type Badge } from "@/lib/badges";

// 배지 계산에 필요한 조회를 한곳에 모은다 -- 배지 탭과 "우리 숲"(딴 배지가
// 숲의 장식이 됨) 두 화면이 같은 결과를 써야 해서.
export async function loadBadges(supabase: SupabaseClient, childId: string): Promise<Badge[]> {
  const [{ data: rows }, { data: memberRows }, { data: completionRows }] = await Promise.all([
    supabase
      .from("reading_records")
      .select("status, read_date, book_id, photo_url, voice_url, favorite, books(author)")
      .eq("child_id", childId),
    supabase.from("group_members").select("group_id").eq("child_id", childId).eq("status", "approved"),
    supabase.from("assignment_completion").select("assignment_id, completed").eq("child_id", childId),
  ]);

  const groupIds = Array.from(new Set((memberRows ?? []).map((m) => m.group_id as string)));
  const { data: listRows } = groupIds.length
    ? await supabase.from("book_lists").select("book_list_items(book_id)").in("group_id", groupIds)
    : { data: [] };
  const recommendedIds = new Set<string>();
  for (const row of listRows ?? []) {
    for (const item of (row.book_list_items as unknown as { book_id: string }[] | null) ?? []) {
      recommendedIds.add(item.book_id);
    }
  }

  const records = (rows ?? []).map((r) => ({
    status: r.status as "want" | "reading" | "done",
    read_date: r.read_date as string,
    book_id: r.book_id as string,
    photo_url: r.photo_url as string | null,
    voice_url: r.voice_url as string | null,
    favorite: r.favorite as boolean,
    author: (r.books as unknown as { author: string | null } | null)?.author ?? null,
  }));
  const recommendedRead = new Set(
    records.filter((r) => r.status === "done" && recommendedIds.has(r.book_id)).map((r) => r.book_id)
  ).size;

  // 숙제 하나에 책이 여러 권이면 completion 행도 책 수만큼이라, 숙제 단위로
  // "전부 완료"를 다시 묶는다.
  const byAssignment = new Map<string, boolean>();
  for (const row of completionRows ?? []) {
    byAssignment.set(
      row.assignment_id as string,
      (byAssignment.get(row.assignment_id as string) ?? true) && (row.completed as boolean)
    );
  }
  const assignmentsDone = Array.from(byAssignment.values()).filter(Boolean).length;

  return computeBadges(records, { groupCount: groupIds.length, recommendedRead, assignmentsDone });
}
