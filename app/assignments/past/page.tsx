import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { getPastAssignments } from "@/lib/assignments";
import AssignmentToday from "@/components/assignment-today";
import GroupFilterSelect, { type FilterGroup } from "@/components/group-filter-select";

export default async function PastAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group: groupParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">지난 숙제</h1>
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
        <h1 className="d text-xl">지난 숙제</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숙제가 여기에 표시돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const [allAssignments, voiceAllowed, { data: memberGroupRows }] = await Promise.all([
    getPastAssignments(supabase, activeChild.id),
    hasVoiceConsent(supabase, userId),
    supabase
      .from("group_members")
      .select("groups(id, name)")
      .eq("child_id", activeChild.id)
      .eq("status", "approved"),
  ]);

  const myGroups: FilterGroup[] = (memberGroupRows ?? [])
    .map((row) => row.groups as unknown as FilterGroup | null)
    .filter((g): g is FilterGroup => Boolean(g))
    .filter((g, i, arr) => arr.findIndex((other) => other.id === g.id) === i);

  const selectedGroupId = groupParam && myGroups.some((g) => g.id === groupParam) ? groupParam : null;
  const assignments = selectedGroupId
    ? allAssignments.filter((a) => a.groupId === selectedGroupId)
    : allAssignments;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/assignments" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 숙제
      </Link>
      <h1 className="d mt-2 text-xl">지난 숙제</h1>

      {myGroups.length > 0 && (
        <div className="mt-4">
          <GroupFilterSelect groups={myGroups} selectedId={selectedGroupId} basePath="/assignments/past" />
        </div>
      )}

      {assignments.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 마감된 숙제가 없어요.
        </p>
      ) : (
        <AssignmentToday
          childId={activeChild.id}
          childName={activeChild.name}
          childAvatar={activeChild.avatar}
          assignments={assignments}
          voiceAllowed={voiceAllowed}
        />
      )}
    </div>
  );
}
