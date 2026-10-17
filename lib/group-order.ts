import type { SupabaseClient } from "@supabase/supabase-js";

// 아이가 속한 그룹의 순서(내 그룹 관리 · 그룹 탭 상단 칩)는 계정 메타데이터
// (auth user_metadata.group_order = { [childId]: groupId[] })에 둔다 —
// 테이블·마이그레이션 없이 기기 사이에서 따라오고, 세션에서 바로 읽힌다(내 도서관과 같은 방식).
export const GROUP_ORDER_CHANGED = "chaeksup:group-order-changed";

type OrderMap = Record<string, string[]>;

async function readMap(supabase: SupabaseClient): Promise<OrderMap> {
  const { data } = await supabase.auth.getSession();
  const raw = data.session?.user.user_metadata?.group_order;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as OrderMap) : {};
}

export async function loadGroupOrder(supabase: SupabaseClient, childId: string): Promise<string[]> {
  const ids = (await readMap(supabase))[childId];
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

export async function saveGroupOrder(supabase: SupabaseClient, childId: string, ids: string[]) {
  const map = await readMap(supabase);
  const { error } = await supabase.auth.updateUser({ data: { group_order: { ...map, [childId]: ids } } });
  if (!error) window.dispatchEvent(new Event(GROUP_ORDER_CHANGED));
  return error;
}

/** 저장된 순서대로 정렬. 순서에 없는(새로 들어온) 그룹은 원래 순서대로 맨 뒤에. */
export function applyGroupOrder<T extends { id: string }>(list: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (rank.get(a.item.id) ?? 1e6 + a.i) - (rank.get(b.item.id) ?? 1e6 + b.i))
    .map(({ item }) => item);
}
