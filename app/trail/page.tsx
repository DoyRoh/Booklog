import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getRecommendBooks } from "@/lib/recommend-books";
import RecommendShelf from "@/components/recommend-shelf";
import GroupFilterSelect, { type FilterGroup } from "@/components/group-filter-select";
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
      <div className="mx-auto max-w-[520px] px-6 pt-8">
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
      <div className="mx-auto max-w-[520px] px-6 pt-8">
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
      <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
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

  // 쿼리의 group이 실제 소속 그룹일 때만 인정, 아니면 첫 그룹.
  const selectedGroup = myGroups.find((g) => g.id === groupParam) ?? myGroups[0];
  const recommend = await getRecommendBooks(supabase, selectedGroup.id, activeChild.id);

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
      {myGroups.length > 1 ? (
        <GroupFilterSelect groups={myGroups} selectedId={selectedGroup.id} basePath="/trail" allLabel="" />
      ) : (
        <p className="d text-base">{selectedGroup.name}의 추천도서</p>
      )}

      <div className="mt-3">
        <RecommendShelf groupId={selectedGroup.id} books={recommend.books} activeChildId={activeChild.id} />
      </div>

      <Link
        href="/recommend"
        className="d mt-8 block rounded-[14px] border py-3 text-center text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
      >
        다른 그룹 찾기
      </Link>
    </div>
  );
}
