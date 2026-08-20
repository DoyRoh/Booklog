import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveChild = {
  id: string;
  name: string;
  avatar: "rabbit" | "dog" | "cat" | null;
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
  const { data: profile } = await supabase
    .from("users")
    .select("active_child_id, children(id, name, avatar)")
    .eq("id", userId)
    .single();

  const embeddedChild = profile?.children as unknown as ActiveChild | null | undefined;
  if (embeddedChild) return embeddedChild;

  const { data: guardianRows } = await supabase
    .from("child_guardians")
    .select("children(id, name, avatar)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  const first = guardianRows?.[0]?.children as unknown as ActiveChild | null | undefined;
  return first ?? null;
}
