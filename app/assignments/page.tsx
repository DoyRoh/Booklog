import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { getAllAssignments } from "@/lib/assignments";
import AssignmentsBrowser from "@/components/assignments-browser";
import { CHILD_GROUP_BAR_HEIGHT } from "@/components/child-group-bar";
import { pickActiveChildGroupId } from "@/lib/active-child-group";

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

  // 그룹 선택은 숲길 탭과 공유한다(children.active_group_id) -- 그룹
  // 전환 바 자체는 루트 레이아웃의 `ChildGroupBar`가 그린다. 그룹이
  // 하나도 없으면 그 바도 안 뜨므로(고를 게 없어서) 그만큼 위쪽 여백을
  // 미리 마련하지 않는다.
  const selectedId = pickActiveChildGroupId(myGroups, groupParam, activeChild.activeGroupId);
  const visible = selectedId === "all" ? assignments : assignments.filter((a) => a.groupId === selectedId);
  const showGroupBar = myGroups.length > 0;

  return (
    <div
      className="mx-auto max-w-[520px] px-5 pb-10"
      style={{ paddingTop: showGroupBar ? `${32 + CHILD_GROUP_BAR_HEIGHT}px` : "32px" }}
    >
      <AssignmentsBrowser
        childId={activeChild.id}
        childName={activeChild.name}
        assignments={visible}
        voiceAllowed={voiceAllowed}
        mode="current"
      />
    </div>
  );
}
