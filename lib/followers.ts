import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

/**
 * 공개 그룹의 팔로워 수(마이그레이션 0031의 group_follower_counts).
 * 함수가 아직 없으면(마이그레이션 전) 빈 Map -- 숫자만 안 보일 뿐 화면은 그대로.
 */
export async function getFollowerCounts(supabase: AnyClient, groupIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (groupIds.length === 0) return counts;
  const { data, error } = await supabase.rpc("group_follower_counts", { p_group_ids: groupIds });
  if (error || !data) return counts;
  for (const row of data as { group_id: string; followers: number }[]) {
    counts.set(row.group_id, row.followers);
  }
  return counts;
}
