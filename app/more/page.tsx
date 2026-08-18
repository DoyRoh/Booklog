import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";
import ChildSwitcher from "@/components/child-switcher";

const ROLE_LABELS: Record<string, string> = {
  parent: "아이 & 부모",
  teacher: "교사",
  curator: "큐레이터",
};

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">더보기</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, active_child_id")
    .eq("id", user.id)
    .single();

  const { data: guardianRows } = await supabase
    .from("child_guardians")
    .select("children(id, name, avatar, birth_date)")
    .eq("user_id", user.id);

  type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null; birth_date: string | null };
  const children = (guardianRows ?? [])
    .map((row) => row.children as unknown as ChildRow | null)
    .filter((child): child is ChildRow => Boolean(child));

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <h1 className="d text-xl">더보기</h1>

      <div
        className="mt-6 rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm">{user.email}</p>
            {profile?.role && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
                {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            )}
          </div>
          <SignOutButton />
        </div>
      </div>

      {profile?.role === "parent" && (
        <div className="mt-8">
          <p className="d text-lg">아이 관리</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            선택한 아이 기준으로 책장·기록이 표시돼요.
          </p>
          <ChildSwitcher
            userId={user.id}
            childList={children}
            activeChildId={profile?.active_child_id ?? null}
          />
        </div>
      )}
    </div>
  );
}
