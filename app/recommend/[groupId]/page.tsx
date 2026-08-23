import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import GroupApprovals from "@/components/group-approvals";
import AddBookToList from "@/components/add-book-to-list";
import BrowseGroups from "@/components/browse-groups";
import CreateAssignment from "@/components/create-assignment";
import RecommendBookList, { type RecommendBook } from "@/components/recommend-book-list";

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
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href="/login" className="text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 서로 무관한 조회 넷(그룹 정보, 내 운영진 멤버십, 활성 아이, 책 목록)을
  // 동시에 왕복한다.
  const [{ data: group }, { data: myMembership }, activeChild, { data: bookList }] = await Promise.all([
    supabase.from("groups").select("id, name, type, join_policy, invite_code").eq("id", groupId).single(),
    supabase
      .from("group_members")
      .select("role, status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle(),
    getActiveChild(supabase, userId),
    supabase.from("book_lists").select("id, name").eq("group_id", groupId).limit(1).maybeSingle(),
  ]);

  if (!group) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">추천</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          그룹을 찾을 수 없어요.
        </p>
        <Link href="/recommend" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          추천 탭으로
        </Link>
      </div>
    );
  }

  const isOperator =
    myMembership?.role === "teacher" ||
    myMembership?.role === "admin" ||
    myMembership?.role === "curator";

  const [{ data: childMembership }, { data: itemRows }] = await Promise.all([
    activeChild
      ? supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("child_id", activeChild.id)
          .eq("status", "approved")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    bookList
      ? supabase
          .from("book_list_items")
          .select("id, required, books(id, title, author, cover_url)")
          .eq("book_list_id", bookList.id)
      : Promise.resolve({ data: null }),
  ]);

  const isMember = Boolean(myMembership) || Boolean(childMembership);

  const items = (itemRows ?? [])
    .map((row) => ({
      id: row.id,
      required: row.required,
      book: row.books as unknown as
        | { id: string; title: string; author: string | null; cover_url: string | null }
        | null,
    }))
    .filter((row) => row.book);

  const listedBookIds = items.map((row) => row.book!.id);

  // 여기서부터 넷(분야, 책장 여부, 승인 대기 목록, 숙제 목록)은 서로
  // 무관하므로(승인 대기/숙제는 isOperator·isMember에만 의존) 동시에
  // 왕복한다.
  const [{ data: categoryRows }, { data: shelfRows }, { data: pendingRows }, { data: assignmentRows }] =
    await Promise.all([
      listedBookIds.length
        ? supabase.from("book_categories").select("book_id, category").in("book_id", listedBookIds)
        : Promise.resolve({ data: [] }),
      activeChild && listedBookIds.length
        ? supabase.from("reading_records").select("book_id").eq("child_id", activeChild.id).in("book_id", listedBookIds)
        : Promise.resolve({ data: [] }),
      isOperator
        ? supabase.from("group_members").select("id, children(name)").eq("group_id", groupId).eq("status", "pending")
        : Promise.resolve({ data: [] }),
      isOperator || isMember
        ? supabase
            .from("assignments")
            .select("id, title, description, start_date, end_date, assignment_books(books(title))")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const categoriesByBook = new Map<string, string[]>();
  for (const row of categoryRows ?? []) {
    const list = categoriesByBook.get(row.book_id) ?? [];
    list.push(row.category);
    categoriesByBook.set(row.book_id, list);
  }

  const shelvedBookIds = new Set((shelfRows ?? []).map((row) => row.book_id));

  const recommendBooks: RecommendBook[] = items.map((row) => ({
    itemId: row.id,
    bookId: row.book!.id,
    title: row.book!.title,
    author: row.book!.author,
    coverUrl: row.book!.cover_url,
    categories: categoriesByBook.get(row.book!.id) ?? [],
    required: row.required,
    inShelf: shelvedBookIds.has(row.book!.id),
  }));

  const pending = (pendingRows ?? [])
    .map((row) => ({
      id: row.id,
      childName: (row.children as unknown as { name: string } | null)?.name ?? "",
    }))
    .filter((row) => row.childName);

  const assignments = (assignmentRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    bookTitles: ((row.assignment_books as unknown as { books: { title: string } | null }[] | null) ?? [])
      .map((ab) => ab.books?.title)
      .filter((title): title is string => Boolean(title)),
  }));

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/recommend" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 추천
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
          <p className="d text-lg">{group.invite_code}</p>
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
          <p className="d text-lg">가입 승인 대기</p>
          <div className="mt-3">
            <GroupApprovals pending={pending} />
          </div>
        </div>
      )}

      <div className="mt-8">
        <p className="d text-lg">추천도서</p>
        <div className="mt-3">
          <RecommendBookList
            groupId={groupId}
            listName={bookList?.name ?? "추천도서"}
            books={recommendBooks}
            activeChildId={activeChild?.id ?? null}
          />
        </div>
      </div>

      {isOperator && bookList && (
        <div className="mt-8">
          <AddBookToList bookListId={bookList.id} />
        </div>
      )}

      {(isOperator || isMember) && (
        <div className="mt-8">
          <p className="d text-lg">숙제</p>
          {assignments.length === 0 ? (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
              아직 등록된 숙제가 없어요.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-[var(--r)] border p-4"
                  style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                >
                  <p className="d text-sm">{assignment.title}</p>
                  {assignment.description && (
                    <p className="mt-1 text-sm" style={{ color: "var(--ink)" }}>
                      {assignment.description}
                    </p>
                  )}
                  {(assignment.startDate || assignment.endDate) && (
                    <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
                      {assignment.startDate ?? "~"} ~ {assignment.endDate ?? ""}
                    </p>
                  )}
                  {assignment.bookTitles.length > 0 && (
                    <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
                      {assignment.bookTitles.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOperator && (
            <div className="mt-4">
              <CreateAssignment
                groupId={groupId}
                books={items
                  .filter((item) => item.book)
                  .map((item) => ({ id: item.book!.id, title: item.book!.title }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
