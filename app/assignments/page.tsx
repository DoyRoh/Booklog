import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { getAllAssignments } from "@/lib/assignments";
import { isPast } from "@/lib/assignment-period";
import AssignmentsBrowser from "@/components/assignments-browser";
import GroupTiles, { type GroupTile } from "@/components/group-tiles";

// 숙제 탭 -- 숲길처럼 상단에 그룹 타일(전체 · 그룹들 · + 그룹 찾기)을 두고
// 고른 그룹의 숙제만 본다. 그 아래 이번 주 숙제가 먼저, 다가오는 숙제,
// 지난 숙제 보기. 검색은 고른 범위 전체에서.
export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group: groupParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숙제</h1>
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
        <h1 className="d text-xl">숙제</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숙제가 여기에 표시돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const [assignments, voiceAllowed, { data: memberRows }] = await Promise.all([
    getAllAssignments(supabase, activeChild.id),
    hasVoiceConsent(supabase, userId),
    supabase.from("group_members").select("groups(id, name)").eq("child_id", activeChild.id).eq("status", "approved"),
  ]);

  type GroupRow = { id: string; name: string };
  const myGroups = (memberRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g))
    .filter((g, i, arr) => arr.findIndex((o) => o.id === g.id) === i);

  // 타일 배지 = 아직 안 끝난(마감 안 지났고 책이 남은) 숙제 수.
  const tiles: GroupTile[] = myGroups.map((g) => ({
    id: g.id,
    name: g.name,
    newCount: assignments.filter(
      (a) => a.groupId === g.id && !isPast(a) && a.books.some((b) => !b.completed)
    ).length,
  }));

  const selectedId = myGroups.some((g) => g.id === groupParam) ? (groupParam as string) : "all";
  const visible = selectedId === "all" ? assignments : assignments.filter((a) => a.groupId === selectedId);

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <GroupTiles groups={tiles} selectedId={selectedId} basePath="/assignments" allLabel="전체" />
      <div className="mt-5">
        <AssignmentsBrowser
          childId={activeChild.id}
          childName={activeChild.name}
          assignments={visible}
          voiceAllowed={voiceAllowed}
          mode="current"
        />
      </div>
    </div>
  );
}
