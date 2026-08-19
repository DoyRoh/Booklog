import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";
import { computeBadges } from "@/lib/badges";
import { BadgeIcon } from "@/components/icons/misc-icons";

export default async function BadgesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">배지</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, user.id);

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">배지</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 배지가 여기에 표시돼요.
        </p>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("reading_records")
    .select("status, read_date, book_id, photo_url, voice_url")
    .eq("child_id", activeChild.id);

  const badges = computeBadges(rows ?? []);
  const achievedCount = badges.filter((b) => b.achieved).length;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/library" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 책장
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="d text-xl">{activeChild.name}의 배지</h1>
        <span className="text-sm" style={{ color: "var(--ink-2)" }}>
          {achievedCount} / {badges.length}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="flex flex-col items-center gap-1.5 rounded-[var(--r)] border p-3 text-center"
            style={{
              borderColor: badge.achieved ? "var(--point)" : "var(--rule)",
              background: badge.achieved ? "rgba(47,168,79,0.06)" : "var(--card)",
              opacity: badge.achieved ? 1 : 0.55,
            }}
          >
            <BadgeIcon
              width={28}
              height={28}
              style={{ color: badge.achieved ? "var(--point)" : "var(--ink-2)" }}
            />
            <span className="d text-xs">{badge.label}</span>
            <span className="text-[10px]" style={{ color: "var(--ink-2)" }}>
              {badge.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
