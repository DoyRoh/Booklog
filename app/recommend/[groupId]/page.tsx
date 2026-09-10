import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import { getRecommendBooks } from "@/lib/recommend-books";
import GroupApprovals from "@/components/group-approvals";
import AddBookToList from "@/components/add-book-to-list";
import BrowseGroups from "@/components/browse-groups";
import CreateAssignment from "@/components/create-assignment";
import RecommendBookList from "@/components/recommend-book-list";
import RecommendShelf from "@/components/recommend-shelf";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-6 pt-8">
        <Link href="/login" className="text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 서로 무관한 조회 셋(그룹 정보, 내 운영진 멤버십, 활성 아이)을 먼저
  // 동시에 왕복한다 -- 추천도서 목록은 활성 아이 id가 있어야 조회할 수
  // 있어서 그 다음 단계로 미룬다.
  const [{ data: group }, { data: myMembership }, activeChild] = await Promise.all([
    supabase.from("groups").select("id, name, type, join_policy, invite_code").eq("id", groupId).single(),
    supabase
      .from("group_members")
      .select("role, status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle(),
    getActiveChild(supabase, userId),
  ]);

  if (!group) {
    return (
      <div className="mx-auto max-w-[520px] px-6 pt-8">
        <h1 className="d text-xl">그룹</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          그룹을 찾을 수 없어요.
        </p>
        <Link href="/recommend" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          그룹 목록으로
        </Link>
      </div>
    );
  }

  const isOperator =
    myMembership?.role === "teacher" ||
    myMembership?.role === "admin" ||
    myMembership?.role === "curator";

  // 셋 다 activeChild.id/groupId에만 의존하고 서로 무관하므로 동시에
  // 왕복한다. 추천도서 목록 조회는 lib/recommend-books.ts로 옮겨서
  // 숲길 탭(그룹 필터)과 로직을 공유한다.
  const [{ data: childMembership }, { bookListId, listName, books: recommendBooks }, { data: pendingRows }] =
    await Promise.all([
      activeChild
        ? supabase
            .from("group_members")
            .select("id")
            .eq("group_id", groupId)
            .eq("child_id", activeChild.id)
            .eq("status", "approved")
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getRecommendBooks(supabase, groupId, activeChild?.id ?? null),
      isOperator
        ? supabase.from("group_members").select("id, children(name)").eq("group_id", groupId).eq("status", "pending")
        : Promise.resolve({ data: [] }),
    ]);

  const isMember = Boolean(myMembership) || Boolean(childMembership);

  const pending = (pendingRows ?? [])
    .map((row) => ({
      id: row.id,
      childName: (row.children as unknown as { name: string } | null)?.name ?? "",
    }))
    .filter((row) => row.childName);

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
      <Link href="/recommend" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 그룹 목록
      </Link>

      <h1 className="d mt-2 text-xl">{group.name}</h1>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {GROUP_TYPE_LABELS[group.type] ?? group.type}
      </p>

      {isOperator && group.join_policy === "approval" && group.invite_code && (
        <div
          className="mt-4 rounded-[var(--r)] border p-4"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            초대 코드
          </p>
          <p className="d text-base">{group.invite_code}</p>
        </div>
      )}

      {!isOperator && group.join_policy === "open" && (
        <div className="mt-4">
          <BrowseGroups
            groups={[{ id: group.id, name: group.name, type: group.type }]}
            followingIds={isMember ? [group.id] : []}
            activeChildId={activeChild?.id ?? null}
          />
        </div>
      )}

      {isOperator && (
        <div className="mt-8">
          <p className="d text-base">가입 승인 대기</p>
          <div className="mt-3">
            <GroupApprovals pending={pending} />
          </div>
        </div>
      )}

      {/* 숲지기에겐 관리 순서로: "책 추가"(검색·바코드·ISBN)가 먼저, 그 아래
          올린 책 목록(날짜·분야·제목). 예전엔 부모용 목록(진행률·"책장에
          꽂기")이 먼저 떠서, 숲지기가 "책장에 꽂아야 추천도서/숙제가 되나"로
          헷갈렸다 -- 추천도서는 책장과 무관하게 여기서 검색해 바로 올린다. */}
      {isOperator && bookListId && (
        <div className="mt-8">
          <p className="d text-base">추천도서에 책 올리기</p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            제목을 검색하거나 바코드를 찍어 바로 올려요. 책장에 먼저 꽂을 필요 없어요.
          </p>
          <div className="mt-3">
            <AddBookToList bookListId={bookListId} />
          </div>
        </div>
      )}

      <div className="mt-8">
        <p className="d text-base">{isOperator ? `추천도서 ${recommendBooks.length}권` : "추천도서"}</p>
        <div className="mt-3">
          {isOperator ? (
            <RecommendBookList groupId={groupId} listName={listName} books={recommendBooks} activeChildId={null} manage />
          ) : (
            <RecommendShelf groupId={groupId} books={recommendBooks} activeChildId={activeChild?.id ?? null} />
          )}
        </div>
      </div>

      {/* 부모가 보는 숙제 목록/진행 현황은 숲길 탭(그룹 필터)에서 다룬다 --
          여기는 운영진이 새 숙제를 만드는 자리로만 남겨둔다. */}
      {isOperator && (
        <div className="mt-8" id="assignment">
          <p className="d text-base">숙제 만들기</p>
          <div className="mt-3">
            <CreateAssignment
              groupId={groupId}
              books={recommendBooks.map((book) => ({ id: book.bookId, title: book.title }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
