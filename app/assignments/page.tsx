import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { getActiveAndUpcomingAssignments } from "@/lib/assignments";
import { getRecommendBooks } from "@/lib/recommend-books";
import AssignmentToday from "@/components/assignment-today";
import RecommendBookList from "@/components/recommend-book-list";
import GroupFilterSelect, { type FilterGroup } from "@/components/group-filter-select";

export default async function AssignmentsPage({
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

  const [allAssignments, voiceAllowed, { data: memberGroupRows }] = await Promise.all([
    getActiveAndUpcomingAssignments(supabase, activeChild.id),
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

  // 쿼리로 들어온 group이 실제로 이 아이가 속한 그룹일 때만 필터로 인정한다
  // (다른 그룹 id를 넣어도 조용히 무시되고 전체 보기로 대체됨).
  const selectedGroupId = groupParam && myGroups.some((g) => g.id === groupParam) ? groupParam : null;
  const selectedGroup = selectedGroupId ? myGroups.find((g) => g.id === selectedGroupId) ?? null : null;

  const recommend = selectedGroupId
    ? await getRecommendBooks(supabase, selectedGroupId, activeChild.id)
    : null;

  const assignments = selectedGroupId
    ? allAssignments.filter((a) => a.groupId === selectedGroupId)
    : allAssignments;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      {myGroups.length > 0 && (
        <GroupFilterSelect groups={myGroups} selectedId={selectedGroupId} basePath="/assignments" />
      )}

      {selectedGroup && recommend && (
        <div className="mt-6">
          <p className="d text-lg">{selectedGroup.name}의 추천도서</p>
          <div className="mt-3">
            <RecommendBookList
              groupId={selectedGroup.id}
              listName={recommend.listName}
              books={recommend.books}
              activeChildId={activeChild.id}
            />
          </div>
        </div>
      )}

      <div className="mt-8">
        <p className="d text-lg">숙제</p>
        {assignments.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
            지금 진행 중이거나 예정된 숙제가 없어요.
          </p>
        ) : (
          <AssignmentToday
            childId={activeChild.id}
            childName={activeChild.name}
            assignments={assignments}
            voiceAllowed={voiceAllowed}
          />
        )}
      </div>

      <Link
        href={selectedGroupId ? `/assignments/past?group=${selectedGroupId}` : "/assignments/past"}
        className="d mt-8 block rounded-[14px] border py-3 text-center text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
      >
        지난 숙제 보기
      </Link>
    </div>
  );
}
