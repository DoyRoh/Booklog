import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";
import GroupApprovals from "@/components/group-approvals";
import AddBookToList from "@/components/add-book-to-list";
import BrowseGroups from "@/components/browse-groups";
import CreateAssignment from "@/components/create-assignment";

const TYPE_LABELS: Record<string, string> = {
  kindergarten: "유치원",
  school: "학교",
  library: "도서관",
  family: "가족",
  community: "커뮤니티",
  creator: "크리에이터",
};

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href="/login" className="text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, type, join_policy, invite_code")
    .eq("id", groupId)
    .single();

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

  const { data: myMembership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  const isOperator =
    myMembership?.role === "teacher" ||
    myMembership?.role === "admin" ||
    myMembership?.role === "curator";

  const activeChild = await getActiveChild(supabase, user.id);

  const { data: childMembership } = activeChild
    ? await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("child_id", activeChild.id)
        .eq("status", "approved")
        .maybeSingle()
    : { data: null };

  const isMember = Boolean(myMembership) || Boolean(childMembership);

  const { data: bookList } = await supabase
    .from("book_lists")
    .select("id, name")
    .eq("group_id", groupId)
    .limit(1)
    .maybeSingle();

  const { data: itemRows } = bookList
    ? await supabase
        .from("book_list_items")
        .select("id, books(id, title, author, cover_url)")
        .eq("book_list_id", bookList.id)
    : { data: null };

  const items = (itemRows ?? [])
    .map((row) => ({
      id: row.id,
      book: row.books as unknown as
        | { id: string; title: string; author: string | null; cover_url: string | null }
        | null,
    }))
    .filter((row) => row.book);

  let pending: { id: string; childName: string }[] = [];
  if (isOperator) {
    const { data: pendingRows } = await supabase
      .from("group_members")
      .select("id, children(name)")
      .eq("group_id", groupId)
      .eq("status", "pending");
    pending = (pendingRows ?? [])
      .map((row) => ({
        id: row.id,
        childName: (row.children as unknown as { name: string } | null)?.name ?? "",
      }))
      .filter((row) => row.childName);
  }

  let assignments: {
    id: string;
    title: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    bookTitles: string[];
  }[] = [];
  if (isOperator || isMember) {
    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select("id, title, description, start_date, end_date, assignment_books(books(title))")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    assignments = (assignmentRows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      bookTitles: (
        (row.assignment_books as unknown as { books: { title: string } | null }[] | null) ?? []
      )
        .map((ab) => ab.books?.title)
        .filter((title): title is string => Boolean(title)),
    }));
  }

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/recommend" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 추천
      </Link>

      <h1 className="d mt-2 text-xl">{group.name}</h1>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {TYPE_LABELS[group.type] ?? group.type}
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

      {!isOperator && !isMember && group.join_policy === "open" && (
        <div className="mt-4">
          <BrowseGroups
            groups={[{ id: group.id, name: group.name, type: group.type }]}
            followingIds={[]}
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
        {items.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 추천도서가 없어요.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-4">
            {items.map(({ id, book }) => (
              <div key={id} className="flex flex-col gap-1.5">
                <div
                  className="aspect-[3/4] overflow-hidden rounded-[10px]"
                  style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
                >
                  {book?.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center">
                      <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
                        {book?.title}
                      </span>
                    </div>
                  )}
                </div>
                <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                  {book?.title}
                </p>
              </div>
            ))}
          </div>
        )}
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
