import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveChild = {
  id: string;
  name: string;
  avatar: "rabbit" | "dog" | "cat" | null;
  /** 숲길·숙제 탭이 공유하는 "지금 보고 있는 그룹"(children.active_group_id). */
  activeGroupId: string | null;
};

/**
 * Resolves which child's shelf/records the current parent is looking at:
 * users.active_child_id if set, otherwise their first linked child.
 */
export async function getActiveChild(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<ActiveChild | null> {
  // active_child_id와 그 아이 정보를 왕복 한 번으로 같이 가져온다(전에는
  // users 조회 후 children을 또 조회하는 순차 왕복 2번이었음 -- 거의 모든
  // 부모 화면이 이 함수를 부르므로, 여기서 줄인 왕복이 체감 속도에 꽤
  // 영향을 준다).
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("active_child_id, children(id, name, avatar, active_group_id)")
    .eq("id", userId)
    .single();

  // 조회 자체가 실패했는데 조용히 null로 넘어가면 "아이가 없다"는 빈 상태로
  // 위장돼(예: 이번처럼 active_group_id 컬럼을 마이그레이션 전에 select에
  // 추가한 경우) 화면엔 "더보기에서 아이를 추가해 주세요"만 뜨고 원인을
  // 알 수 없다. 여기서 던져서 app/error.tsx가 잡게 한다(CLAUDE.md의
  // "조회 실패가 빈 상태로 위장되던 문제" 원칙과 동일).
  if (profileError) throw profileError;

  type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null; active_group_id: string | null };
  const embeddedChild = profile?.children as unknown as ChildRow | null | undefined;
  if (embeddedChild) {
    return { id: embeddedChild.id, name: embeddedChild.name, avatar: embeddedChild.avatar, activeGroupId: embeddedChild.active_group_id };
  }

  const { data: guardianRows, error: guardianError } = await supabase
    .from("child_guardians")
    .select("children(id, name, avatar, active_group_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (guardianError) throw guardianError;

  const first = guardianRows?.[0]?.children as unknown as ChildRow | null | undefined;
  return first ? { id: first.id, name: first.name, avatar: first.avatar, activeGroupId: first.active_group_id } : null;
}
