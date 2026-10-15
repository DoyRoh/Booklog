import type { SupabaseClient } from "@supabase/supabase-js";
import { getHiddenContent, isGroupHidden } from "@/lib/moderation";
import { getFollowerCounts } from "@/lib/followers";

export type BrowseGroup = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  operatorName: string | null;
  operatorAvatar: "bear" | "egret" | null;
  ownerId: string | null;
  verified: boolean;
  bookCount: number;
  followers: number;
  covers: string[];
};

type OpenRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  operator_name: string | null;
  operator_avatar?: string | null;
  owner_id: string | null;
  verified: boolean | null;
  book_lists: { book_list_items: { created_at: string | null; books: { cover_url: string | null } | null }[] }[] | null;
};

/**
 * 둘러볼 수 있는 공개 그룹 -- 그룹 찾기(/recommend)와, 아직 그룹이 없을 때의
 * 그룹 탭이 같이 쓴다. 이미 따르는 그룹(excludeIds)과 신고·차단한 그룹은 뺀다.
 * 책숲 공식 → 팔로워 많은 순 → 추천도서 많은 순.
 */
export async function loadBrowseGroups(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  excludeIds: string[] = []
): Promise<BrowseGroup[]> {
  const cols = "id, name, type, description, operator_name, owner_id, verified, book_lists(book_list_items(created_at, books(cover_url)))";
  const [first, hidden] = await Promise.all([
    supabase.from("groups").select(`${cols}, operator_avatar`).eq("join_policy", "open"),
    getHiddenContent(supabase),
  ]);
  // operator_avatar(0028)가 아직 없으면 얼굴 없이 다시 -- 둘러보기 자체는 안 깨지게.
  const data = first.error ? (await supabase.from("groups").select(cols).eq("join_policy", "open")).data : first.data;
  const rows = ((data ?? []) as unknown as OpenRow[]).filter((g) => !excludeIds.includes(g.id) && !isGroupHidden(hidden, g));
  const followerCounts = await getFollowerCounts(
    supabase,
    rows.map((g) => g.id)
  );
  return rows
    .map((g): BrowseGroup => {
      const items = (g.book_lists ?? [])
        .flatMap((list) => list.book_list_items ?? [])
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      return {
        id: g.id,
        name: g.name,
        type: g.type,
        description: g.description,
        operatorName: g.operator_name,
        operatorAvatar: g.operator_avatar === "egret" ? "egret" : g.operator_avatar === "bear" ? "bear" : null,
        ownerId: g.owner_id,
        verified: Boolean(g.verified),
        bookCount: items.length,
        followers: followerCounts.get(g.id) ?? 0,
        covers: items.map((it) => it.books?.cover_url ?? null).filter((c): c is string => Boolean(c)).slice(0, 4),
      };
    })
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.followers - a.followers || b.bookCount - a.bookCount);
}
