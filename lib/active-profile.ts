import type { SupabaseClient } from "@supabase/supabase-js";

export type OperatorAvatar = "bear" | "egret";

// "숲지기" = 선생님·기관·인플루언서를 통칭하는 운영 프로필. 예전엔 교사와
// 큐레이터를 다른 화면으로 갈랐지만, 실제로 하는 일(추천도서 올리기, 숙제
// 내기, 아이들 상태 보기)이 같아서 하나로 합쳤다. DB의 group_members.role
// (teacher/admin/curator)은 그대로 두되 화면에서는 전부 같은 뜻으로 본다.
export type ActiveProfile =
  | { type: "child" }
  | { type: "operator"; operatorAvatar: OperatorAvatar | null };

/**
 * 계정 하나가 아이 프로필과 숲지기 프로필을 동시에 가질 수 있다.
 * users.active_profile_type("child"|"operator")이 지금 어느 쪽을 보고
 * 있는지를 정한다. 운영 중인 그룹이 하나도 없어졌으면(탈퇴 등) 조용히
 * 아이 프로필로 되돌아간다.
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

  if ((memberships ?? []).length === 0) return { type: "child" };
  return { type: "operator", operatorAvatar: (user.operator_avatar as OperatorAvatar | null) ?? null };
}
