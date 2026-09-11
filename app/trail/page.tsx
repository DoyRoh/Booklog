import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getRecommendBooks } from "@/lib/recommend-books";
import RecommendShelf from "@/components/recommend-shelf";
import { CHILD_GROUP_BAR_HEIGHT } from "@/components/child-group-bar";
import { pickActiveChildGroupId } from "@/lib/active-child-group";

type FilterGroup = { id: string; name: string };
import Illustration from "@/components/illustration";

// 숲길 탭 -- 숲지기(선생님·기관)가 등불로 비춰 준 길, 즉 그룹의 추천도서.
// 그룹을 골라 그 그룹의 추천도서를 보고, 읽은 책엔 발자국, 숙제에 들어간
// 책엔 등불이 붙는다. 숙제 자체는 숙제 탭에서.
export default async function TrailPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group: groupParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숲길</h1>
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
        <h1 className="d text-xl">숲길</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숲지기의 추천도서가 여기에 표시돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const { data: memberGroupRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("child_id", activeChild.id)
    .eq("status", "approved");

  const myGroups: FilterGroup[] = (memberGroupRows ?? [])
    .map((row) => row.groups as unknown as FilterGroup | null)
    .filter((g): g is FilterGroup => Boolean(g))
    .filter((g, i, arr) => arr.findIndex((other) => other.id === g.id) === i);

  if (myGroups.length === 0) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
        <div className="flex items-end gap-3">
          <Illustration name="bear-lantern" height={110} className="flex-none" />
          <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
            아직 길을 비춰 줄 숲지기가 없어요
          </p>
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          선생님 반이나 도서관 같은 그룹에 들어가면, 숲지기가 골라 준 추천도서가 여기에 펼쳐져요.
        </p>
        <Link
          href="/recommend"
          className="d mt-4 block rounded-[14px] py-3 text-center text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          그룹 찾기 · 초대 코드로 들어가기
        </Link>
      </div>
    );
  }

  // 그룹 선택은 숙제 탭과 공유한다(children.active_group_id) -- URL의
  // ?group= > 저장된 값 > "전체" 순. 그룹 전환 바 자체는 루트 레이아웃의
  // `ChildGroupBar`가 그린다(사용자 지적: "여기저기서 그룹전환하느라
  // 정신없다" -- 숲길에서 고른 그룹이 숙제 탭에도 그대로 이어진다).
  const selectedId = pickActiveChildGroupId(myGroups, groupParam, activeChild.activeGroupId);
  const selectedGroup = selectedId !== "all" ? (myGroups.find((g) => g.id === selectedId) ?? null) : null;
  const groupsToLoad = selectedGroup ? [selectedGroup] : myGroups;

  // "전체"면 모든 그룹의 추천도서를 합쳐(같은 책은 먼저 나온 그룹 것
  // 하나만) 최근 올린 순으로 보여준다.
  const perGroup = await Promise.all(groupsToLoad.map((g) => getRecommendBooks(supabase, g.id, activeChild.id)));

  const seen = new Set<string>();
  const books = perGroup
    .flatMap((r, i) => r.books.map((b) => ({ ...b, groupId: groupsToLoad[i].id })))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .filter((b) => (seen.has(b.bookId) ? false : (seen.add(b.bookId), true)));

  return (
    <div className="mx-auto max-w-[520px] px-5 pb-10" style={{ paddingTop: `${32 + CHILD_GROUP_BAR_HEIGHT}px` }}>
      <p className="d text-base">{selectedGroup ? `${selectedGroup.name}의 추천도서` : "모든 그룹의 추천도서"}</p>

      <div className="mt-3">
        <RecommendShelf groupId={selectedGroup?.id ?? groupsToLoad[0].id} books={books} activeChildId={activeChild.id} />
      </div>
    </div>
  );
}
