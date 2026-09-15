/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export const OPERATOR_ROLES = ["teacher", "admin", "curator"];

// 숲지기 화면의 조회를 "내 운영 그룹 목록 → 그 그룹들의 데이터" 두 번
// 왕복이 아니라, groups에서 시작하는 임베드 **한 번**으로 끝낸다.
// `mine`(내 운영진 행)은 !inner라 내가 운영진으로 승인된 그룹만 남고,
// 호출자가 넘긴 나머지 임베드는 그 그룹들의 데이터다. 결과 모양은
// 호출자가 `.overrideTypes<Row[], { merge: false }>()`로 정한다.
export function operatorGroupsQuery(supabase: SupabaseClient<any>, userId: string, embeds?: string) {
  const select = embeds
    ? `id, name, type, created_at, mine:group_members!inner(user_id), ${embeds}`
    : `id, name, type, created_at, mine:group_members!inner(user_id)`;
  return supabase
    .from("groups")
    .select(select)
    .eq("mine.user_id", userId)
    .in("mine.role", OPERATOR_ROLES)
    .eq("mine.status", "approved")
    .order("created_at", { ascending: true });
}
