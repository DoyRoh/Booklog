import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { computeBadges } from "@/lib/badges";
import BadgeArt from "@/components/badge-art";
import SceneBanner from "@/components/scene-banner";

export default async function BadgesPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">배지</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);

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
      <SceneBanner scene="pattern" height={110} className="mb-5" />
      <div className="flex items-center justify-between">
        <p className="hand text-lg" style={{ color: "var(--point-deep)" }}>
          {activeChild.name}의 발자국이 모여 배지가 돼요.
        </p>
        <span className="d text-sm" style={{ color: "var(--ink-2)" }}>
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
            }}
          >
            <BadgeArt id={badge.id} avatar={activeChild.avatar} achieved={badge.achieved} />
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
