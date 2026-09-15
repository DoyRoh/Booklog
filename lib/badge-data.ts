import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBadges, MILESTONE_COUNTS, type Badge } from "@/lib/badges";
import type { OperatorAvatar } from "@/lib/active-profile";

// 배지 계산에 필요한 조회를 한곳에 모은다 -- 배지 탭과 "우리 숲"(딴 배지가
// 숲의 장식이 됨) 두 화면이 같은 결과를 써야 해서.
export type MilestoneMemo = { title: string; memo: string | null };

export type ForestData = {
  badges: Badge[];
  /** 아이가 속한 그룹(숲지기)들 -- 숲길의 숲지기 캐릭터 수·얼굴이 이 목록을 그대로 따른다. */
  groups: { id: string; name: string; avatar: OperatorAvatar | null }[];
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
  const [{ data: rows }, memberResult, { data: completionRows }] = await Promise.all([
    supabase
      .from("reading_records")
      .select("status, read_date, created_at, book_id, photo_url, voice_url, favorite, parent_memo, books(title, author)")
      .eq("child_id", childId),
    supabase
      .from("group_members")
      .select("group_id, groups(name, operator_avatar)")
      .eq("child_id", childId)
      .eq("status", "approved"),
    supabase.from("assignment_completion").select("assignment_id, completed").eq("child_id", childId),
  ]);

  // groups.operator_avatar는 마이그레이션 0028로 추가된 컬럼이라, 아직 그
  // 마이그레이션을 실행하지 않은 프로젝트에서는 이 select 자체가 오류로
  // 돌아온다. 오류를 그냥 무시하면(memberRows가 null) "그룹이 0곳"으로
  // 조용히 잘못 계산돼 "첫 숲지기" 배지·추천도서 배지가 전부 안 딴 것처럼
  // 보이는 사고가 난다(예전에 겪었던 "조회 실패가 빈 상태로 위장" 문제와
  // 같은 유형) -- 이 컬럼 없이 다시 한번 조회해서 최소한 그룹 수·이름은
  // 정확하게 세도록 방어한다(얼굴만 null로 남아 기본 곰으로 보임).
  let memberRows: { group_id: string; groups: unknown }[] | null = memberResult.data;
  if (memberResult.error) {
    const fallback = await supabase
      .from("group_members")
      .select("group_id, groups(name)")
      .eq("child_id", childId)
      .eq("status", "approved");
    memberRows = (fallback.data ?? []).map((m) => ({
      group_id: m.group_id as string,
      groups: { ...(m.groups as object), operator_avatar: null },
    }));
  }

  const groupIds = Array.from(new Set((memberRows ?? []).map((m) => m.group_id as string)));
  const groups = groupIds.map((id) => {
    const g = (memberRows ?? []).find((m) => m.group_id === id)?.groups as unknown as {
      name: string;
      operator_avatar: OperatorAvatar | null;
    } | null;
    return { id, name: g?.name ?? "그룹", avatar: g?.operator_avatar ?? null };
  });
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
