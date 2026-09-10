import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveChild } from "@/lib/active-child";
import type { ActiveProfile, OperatorAvatar } from "@/lib/active-profile";

/**
 * 활성 프로필(아이/숲지기)과 활성 아이를 **users 조회 한 번**으로 같이 가져온다.
 * getActiveProfile()과 getActiveChild()를 따로 부르면 같은 users 행을 두 번
 * 읽고(상단바·오늘·그룹 화면이 전부 그랬음), 클라이언트 ProfileProvider는
 * 그걸 순차로 기다려서 화면 전환마다 왕복이 3~4번이었다. 여기선 users 1번 +
 * (숲지기일 때만) group_members 1번 + (active_child_id가 없을 때만) 첫 아이 1번.
 */
export async function getProfileSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<{ activeProfile: ActiveProfile; activeChild: ActiveChild | null }> {
  const { data: user } = await supabase
    .from("users")
    .select("active_profile_type, operator_avatar, operator_name, active_child_id, children(id, name, avatar)")
    .eq("id", userId)
    .single();

  const embedded = (user?.children as unknown as ActiveChild | null | undefined) ?? null;
  const wantsOperator = user?.active_profile_type === "operator";

  const [operatorRows, fallbackChild] = await Promise.all([
    wantsOperator
      ? supabase
          .from("group_members")
          .select("role")
          .eq("user_id", userId)
          .eq("status", "approved")
          .in("role", ["teacher", "admin", "curator"])
          .limit(1)
          .then((r) => r.data ?? [])
      : Promise.resolve([] as unknown[]),
    embedded
      ? Promise.resolve(null)
      : supabase
          .from("child_guardians")
          .select("children(id, name, avatar)")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .then((r) => (r.data?.[0]?.children as unknown as ActiveChild | null | undefined) ?? null),
  ]);

  const activeProfile: ActiveProfile =
    wantsOperator && operatorRows.length > 0
      ? {
          type: "operator",
          operatorAvatar: (user?.operator_avatar as OperatorAvatar | null) ?? null,
          operatorName: (user?.operator_name as string | null) ?? null,
        }
      : { type: "child" };

  return { activeProfile, activeChild: embedded ?? fallbackChild };
}
