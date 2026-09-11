import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBadges, MILESTONE_COUNTS, type Badge } from "@/lib/badges";

// 배지 계산에 필요한 조회를 한곳에 모은다 -- 배지 탭과 "우리 숲"(딴 배지가
// 숲의 장식이 됨) 두 화면이 같은 결과를 써야 해서.
export type MilestoneMemo = { title: string; memo: string | null };

export type ForestData = {
  badges: Badge[];
  /** 아이가 속한 그룹(숲지기) 이름들 -- 숲의 곰·백로 수가 이 수만큼 늘어난다. */
  groups: { id: string; name: string }[];
  /**
   * 권수 마일스톤(나무) 하나하나가 그 그루째를 채운 책의 제목·기록 메모.
   * 나무를 눌렀을 때 "이 나무를 심을 때 남긴 메모" 한 줄을 보여주기 위함
   * (사용자 요청: 처음엔 3D에 텍스트를 얹기보다 안내 카드에 한 줄만).
   */
  milestoneMemos: Record<number, MilestoneMemo>;
};

export async function loadBadges(supabase: SupabaseClient, childId: string): Promise<Badge[]> {
  return (await loadForestData(supabase, childId)).badges;
}

export async function loadForestData(supabase: SupabaseClient, childId: string): Promise<ForestData> {
  const [{ data: rows }, { data: memberRows }, { data: completionRows }] = await Promise.all([
    supabase
      .from("reading_records")
      .select("status, read_date, created_at, book_id, photo_url, voice_url, favorite, parent_memo, books(title, author)")
      .eq("child_id", childId),
    supabase.from("group_members").select("group_id, groups(name)").eq("child_id", childId).eq("status", "approved"),
    supabase.from("assignment_completion").select("assignment_id, completed").eq("child_id", childId),
  ]);

  const groupIds = Array.from(new Set((memberRows ?? []).map((m) => m.group_id as string)));
  const groups = groupIds.map((id) => ({
    id,
    name:
      ((memberRows ?? []).find((m) => m.group_id === id)?.groups as unknown as { name: string } | null)?.name ?? "그룹",
  }));
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
    created_at: r.created_at as string,
    book_id: r.book_id as string,
    photo_url: r.photo_url as string | null,
    voice_url: r.voice_url as string | null,
    favorite: r.favorite as boolean,
    parent_memo: r.parent_memo as string | null,
    title: (r.books as unknown as { title: string | null } | null)?.title ?? "",
    author: (r.books as unknown as { author: string | null } | null)?.author ?? null,
  }));

  // 나무 하나(권수 마일스톤)를 심은 순간 = 그 그루째를 채운 책. 읽은 날짜순
  // (같은 날이면 등록 순서)으로 정렬해 몇 번째 완독인지를 셈한다.
  const doneSorted = records
    .filter((r) => r.status === "done")
    .sort((a, b) => a.read_date.localeCompare(b.read_date) || a.created_at.localeCompare(b.created_at));
  const milestoneMemos: Record<number, MilestoneMemo> = {};
  for (const count of MILESTONE_COUNTS) {
    const r = doneSorted[count - 1];
    if (r) milestoneMemos[count] = { title: r.title || "제목 없음", memo: r.parent_memo || null };
  }
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

  return {
    badges: computeBadges(records, { groupCount: groupIds.length, recommendedRead, assignmentsDone }),
    groups,
    milestoneMemos,
  };
}
