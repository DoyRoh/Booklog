import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import SignOutButton from "@/components/sign-out-button";
import ChildSwitcher from "@/components/child-switcher";

const ROLE_LABELS: Record<string, string> = {
  parent: "아이 & 부모",
  teacher: "교사",
  curator: "큐레이터",
};

export default async function MorePage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">더보기</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 화면에 이메일도 보여줘야 하는데, users 테이블에 이미 email이 복제돼
  // 있어서(가입 시 트리거) auth.getUser()로 다시 왕복하지 않고 이 조회에
  // 같이 얹는다.
  const [{ data: profile }, { data: guardianRows }] = await Promise.all([
    supabase.from("users").select("email, role, active_child_id").eq("id", userId).single(),
    supabase.from("child_guardians").select("children(id, name, avatar, birth_date)").eq("user_id", userId),
  ]);

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
            <p className="text-sm">{profile?.email}</p>
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
          <p className="d text-base">아이 관리</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            선택한 아이 기준으로 책장·기록이 표시돼요.
          </p>
          <ChildSwitcher
            userId={userId}
            childList={children}
            activeChildId={profile?.active_child_id ?? null}
          />
        </div>
      )}

      {profile?.role === "parent" && (
        <div className="mt-8">
          <p className="d text-base">그룹 둘러보기</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 안 속한 기관·크리에이터 그룹을 찾아 팔로우하거나, 초대 코드로 학급에 참가할 수 있어요.
          </p>
          <Link
            href="/recommend"
            className="mt-2 block rounded-[var(--r)] border p-4 text-sm"
            style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
          >
            새 그룹 찾기
          </Link>
        </div>
      )}

      {(profile?.role === "teacher" || profile?.role === "curator") && (
        <div className="mt-8">
          <p className="d text-base">대시보드</p>
          <Link
            href={profile.role === "teacher" ? "/teacher" : "/curator"}
            className="mt-2 block rounded-[var(--r)] border p-4 text-sm"
            style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
          >
            {profile.role === "teacher" ? "교사 대시보드로 가기" : "큐레이터 대시보드로 가기"}
          </Link>
        </div>
      )}
    </div>
  );
}
