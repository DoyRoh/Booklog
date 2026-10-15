import type { SupabaseClient } from "@supabase/supabase-js";
import { getHiddenContent, isGroupHidden } from "@/lib/moderation";
import { getFollowerCounts } from "@/lib/followers";
import { ageDistribution, parseAgeBands, type AgeBand } from "@/lib/age-bands";

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
  /** 추천 연령 분포(0038) -- 연령이 정해진 책만 센다. 둘러보기 칩·"우리 아이 나이" 필터에 씀. */
  ages: { band: AgeBand; count: number }[];
  /** 연령이 정해진 책 수(분포의 분모). 0이면 연령 미정 그룹. */
  agedCount: number;
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
  book_lists: {
    book_list_items: { created_at: string | null; age_bands?: string[] | null; books: { cover_url: string | null } | null }[];
  }[] | null;
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
  const cols = (withAge: boolean, withAvatar: boolean) =>
    `id, name, type, description, operator_name, owner_id, verified, book_lists(book_list_items(created_at, ${withAge ? "age_bands, " : ""}books(cover_url)))${withAvatar ? ", operator_avatar" : ""}`;
  const fetchOpen = (withAge: boolean, withAvatar: boolean) =>
    supabase.from("groups").select(cols(withAge, withAvatar)).eq("join_policy", "open");
  const [first, hidden] = await Promise.all([fetchOpen(true, true), getHiddenContent(supabase)]);
  // age_bands(0038)·operator_avatar(0028)가 아직 없으면 그 컬럼 없이 다시 -- 둘러보기 자체는 안 깨지게.
  let result = first;
  if (result.error) result = await fetchOpen(false, true);
  if (result.error) result = await fetchOpen(false, false);
  const data = result.data;
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
      const bandLists = items.map((it) => parseAgeBands(it.age_bands));
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
        ages: ageDistribution(bandLists),
        agedCount: bandLists.filter((b) => b.length > 0).length,
      };
    })
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.followers - a.followers || b.bookCount - a.bookCount);
}
