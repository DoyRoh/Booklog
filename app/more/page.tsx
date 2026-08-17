import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8">
      <h1 className="d text-xl">더보기</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        프로필, 그룹, 설정 메뉴가 여기에 표시됩니다.
      </p>

      <div
        className="mt-6 rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        {user ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{user.email}</span>
            <SignOutButton />
          </div>
        ) : (
          <Link href="/login" className="text-sm" style={{ color: "var(--plum)" }}>
            로그인하기
          </Link>
        )}
      </div>
    </div>
  );
}
