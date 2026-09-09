import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { computeBadges } from "@/lib/badges";
import BadgeGrid from "@/components/badge-grid";
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

  // 독서기록 + 배지 계산에 필요한 그룹/추천도서/숙제 완료 정보를 동시에
  // 왕복한다(전부 activeChild.id에만 의존).
  const [{ data: rows }, { data: memberRows }, { data: completionRows }] = await Promise.all([
    supabase
      .from("reading_records")
      .select("status, read_date, book_id, photo_url, voice_url, favorite, books(author)")
      .eq("child_id", activeChild.id),
    supabase.from("group_members").select("group_id").eq("child_id", activeChild.id).eq("status", "approved"),
    supabase.from("assignment_completion").select("assignment_id, completed").eq("child_id", activeChild.id),
  ]);

  const groupIds = Array.from(new Set((memberRows ?? []).map((m) => m.group_id)));
  const { data: listRows } = groupIds.length
    ? await supabase.from("book_lists").select("book_list_items(book_id)").in("group_id", groupIds)
    : { data: [] };
  const recommendedIds = new Set<string>();
  for (const row of listRows ?? []) {
    for (const item of (row.book_list_items as unknown as { book_id: string }[] | null) ?? []) {
      recommendedIds.add(item.book_id);
    }
  }

  const records = (rows ?? []).map((r) => ({
    status: r.status,
    read_date: r.read_date,
    book_id: r.book_id,
    photo_url: r.photo_url,
    voice_url: r.voice_url,
    favorite: r.favorite,
    author: (r.books as unknown as { author: string | null } | null)?.author ?? null,
  }));
  const recommendedRead = new Set(
    records.filter((r) => r.status === "done" && recommendedIds.has(r.book_id)).map((r) => r.book_id)
  ).size;

  // 숙제 하나에 책이 여러 권이면 completion 행도 책 수만큼이라, 숙제 단위로
  // "전부 완료"를 다시 묶는다.
  const byAssignment = new Map<string, boolean>();
  for (const row of completionRows ?? []) {
    byAssignment.set(row.assignment_id, (byAssignment.get(row.assignment_id) ?? true) && row.completed);
  }
  const assignmentsDone = Array.from(byAssignment.values()).filter(Boolean).length;

  const badges = computeBadges(records, { groupCount: groupIds.length, recommendedRead, assignmentsDone });
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

      <BadgeGrid badges={badges} avatar={activeChild.avatar} />
    </div>
  );
}
