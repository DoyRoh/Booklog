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
  const { data: profile } = await supabase
    .from("users")
    .select("active_child_id")
    .eq("id", userId)
    .single();

  if (profile?.active_child_id) {
    const { data: child } = await supabase
      .from("children")
      .select("id, name, avatar")
      .eq("id", profile.active_child_id)
      .single();
    if (child) return child;
  }

  const { data: guardianRows } = await supabase
    .from("child_guardians")
    .select("children(id, name, avatar)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  const first = guardianRows?.[0]?.children as unknown as ActiveChild | null | undefined;
  return first ?? null;
}
