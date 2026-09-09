import type { SupabaseClient } from "@supabase/supabase-js";

export type OperatorAvatar = "bear" | "egret";

export type ActiveProfile =
  | { type: "child" }
  | { type: "operator"; operatorRole: "teacher" | "curator"; operatorAvatar: OperatorAvatar | null };

/**
 * 계정 하나가 아이 프로필과 선생님/기관 프로필을 동시에 가질 수 있다.
 * users.active_profile_type("child"|"operator")이 지금 어느 쪽을 보고
 * 있는지를 정하고, operator일 때 교사/큐레이터 중 어느 대시보드를 보여줄지는
 * 저장해두지 않고 group_members에서 그때그때 계산한다(그룹 멤버십이 이미
 * 진실의 원천이라 중복 저장하면 어긋날 수 있다). 운영 중인 그룹이 하나도
 * 없어졌으면(탈퇴 등) 조용히 아이 프로필로 되돌아간다.
 */
export async function getActiveProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<ActiveProfile> {
  const { data: user } = await supabase
    .from("users")
    .select("active_profile_type, operator_avatar")
    .eq("id", userId)
    .single();

  if (user?.active_profile_type !== "operator") {
    return { type: "child" };
  }

  const { data: memberships } = await supabase
    .from("group_members")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "approved")
    .in("role", ["teacher", "admin", "curator"]);

  const roles = new Set((memberships ?? []).map((m) => m.role as string));
  if (roles.size === 0) return { type: "child" };
  const operatorRole: "teacher" | "curator" = roles.has("teacher") || roles.has("admin") ? "teacher" : "curator";
  return { type: "operator", operatorRole, operatorAvatar: (user.operator_avatar as OperatorAvatar | null) ?? null };
}
