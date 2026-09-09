import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import Illustration from "@/components/illustration";

type BookCard = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  readCount: number;
  inAssignment: boolean;
};

type GroupSection = { id: string; name: string; memberCount: number; books: BookCard[] };

// 숲지기의 "추천도서" 탭 -- 책별 정리. 그룹마다 추천도서 한 권당 한 줄:
// 우리 아이들 중 몇 명이 읽었는지 + 지금 숙제에 들어 있는지. 누르면 그
// 책을 누가 어디까지 읽었는지(/teacher/books/[bookId]?group=...).
export default async function TeacherBooksPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">추천도서</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin", "curator"])
    .eq("status", "approved");

  type GroupRow = { id: string; name: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const groupIds = groups.map((g) => g.id);
  const today = new Date().toISOString().slice(0, 10);

  type ListRow = {
    group_id: string;
    book_list_items: { book_id: string; books: { id: string; title: string; author: string | null; cover_url: string | null } | null }[] | null;
  };
  const [{ data: listRows }, { data: memberRows }, { data: doneRows }, { data: activeRows }] = groupIds.length
    ? await Promise.all([
        supabase
          .from("book_lists")
          .select("group_id, book_list_items(book_id, books(id, title, author, cover_url))")
          .in("group_id", groupIds),
        supabase
          .from("group_members")
          .select("group_id, child_id")
          .in("group_id", groupIds)
          .eq("status", "approved")
          .not("child_id", "is", null),
        supabase
          .from("reading_records")
          .select("child_id, book_id, group_id")
          .in("group_id", groupIds)
          .eq("status", "done"),
        supabase
          .from("assignments")
          .select("group_id, assignment_books(book_id)")
          .in("group_id", groupIds)
          .or(`start_date.is.null,start_date.lte.${today}`)
          .or(`end_date.is.null,end_date.gte.${today}`),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const memberCountByGroup = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountByGroup.set(row.group_id, (memberCountByGroup.get(row.group_id) ?? 0) + 1);
  }
  // (그룹:책) → 읽은 아이 집합
  const readersByGroupBook = new Map<string, Set<string>>();
  for (const row of doneRows ?? []) {
    if (!row.group_id) continue;
    const key = `${row.group_id}:${row.book_id}`;
    const set = readersByGroupBook.get(key) ?? new Set<string>();
    set.add(row.child_id);
    readersByGroupBook.set(key, set);
  }
  const assignedByGroup = new Map<string, Set<string>>();
  for (const row of activeRows ?? []) {
    const set = assignedByGroup.get(row.group_id) ?? new Set<string>();
    for (const b of (row.assignment_books as unknown as { book_id: string }[] | null) ?? []) set.add(b.book_id);
    assignedByGroup.set(row.group_id, set);
  }

  const sections: GroupSection[] = groups.map((group) => {
    const rows = ((listRows ?? []) as unknown as ListRow[]).filter((r) => r.group_id === group.id);
    const books: BookCard[] = rows
      .flatMap((r) => r.book_list_items ?? [])
      .filter((item) => item.books)
      .map((item) => ({
        bookId: item.books!.id,
        title: item.books!.title,
        author: item.books!.author,
        coverUrl: item.books!.cover_url,
        readCount: readersByGroupBook.get(`${group.id}:${item.books!.id}`)?.size ?? 0,
        inAssignment: assignedByGroup.get(group.id)?.has(item.books!.id) ?? false,
      }))
      .sort((a, b) => Number(b.inAssignment) - Number(a.inAssignment) || b.readCount - a.readCount);
    return { id: group.id, name: group.name, memberCount: memberCountByGroup.get(group.id) ?? 0, books };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <h1 className="d text-xl">추천도서</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        그룹의 책 서랍이에요. 책마다 몇 명이 읽었는지 보이고, 지금 숙제에 들어간 책에는 등불이 켜져요. 꼭 읽혀야 할
        책은 숙제로 내 주세요.
      </p>

      {sections.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 운영하는 그룹이 없어요.
          </p>
          <Link href="/recommend/create" className="d mt-2 inline-block text-sm" style={{ color: "var(--point)" }}>
            + 그룹 만들기
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center justify-between">
                <p className="d text-sm">
                  {section.name}
                  <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--ink-2)" }}>
                    {section.books.length}권
                  </span>
                </p>
                <Link href={`/recommend/${section.id}`} className="text-xs" style={{ color: "var(--point)" }}>
                  + 책 추가
                </Link>
              </div>

              {section.books.length === 0 ? (
                <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  아직 추천도서가 없어요.
                </p>
              ) : (
                <div
                  className="mt-2 overflow-hidden rounded-[var(--r)] border"
                  style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                >
                  {section.books.map((book, index) => (
                    <Link
                      key={book.bookId}
                      href={`/teacher/books/${book.bookId}?group=${section.id}`}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                    >
                      {book.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={book.coverUrl} alt="" className="h-11 w-8 flex-none rounded object-cover" />
                      ) : (
                        <div className="h-11 w-8 flex-none rounded" style={{ background: "var(--paper)" }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{book.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {book.inAssignment && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full py-0.5 pl-1 pr-2 text-[10px]"
                              style={{ background: "rgba(232,163,61,0.16)", color: "var(--lantern)" }}
                            >
                              <Illustration name="lantern-on" height={14} />
                              숙제 중
                            </span>
                          )}
                          {book.author && (
                            <span className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                              {book.author}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="d flex-none text-xs" style={{ color: book.readCount > 0 ? "var(--point-deep)" : "var(--ink-2)" }}>
                        {book.readCount}/{section.memberCount}명 읽음
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
