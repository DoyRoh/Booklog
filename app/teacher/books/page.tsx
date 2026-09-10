import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import Illustration from "@/components/illustration";
import { LogGroup, LogRow, shortMd } from "@/components/log-row";
import { categoryColor } from "@/lib/categories";
import { kstDate } from "@/lib/kst";

type BookCard = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  categories: string[];
  addedAt: string;
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
  const today = kstDate();

  type ListRow = {
    group_id: string;
    book_list_items: {
      book_id: string;
      created_at: string;
      books: { id: string; title: string; author: string | null; cover_url: string | null } | null;
    }[] | null;
  };
  const [{ data: listRows }, { data: memberRows }, { data: doneRows }, { data: activeRows }] = groupIds.length
    ? await Promise.all([
        supabase
          .from("book_lists")
          .select("group_id, book_list_items(book_id, created_at, books(id, title, author, cover_url))")
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

  // 목록 줄의 분야 칩 -- 올라온 책 전부의 분야를 한 번에 가져온다.
  const listedBookIds = Array.from(
    new Set(
      ((listRows ?? []) as unknown as ListRow[]).flatMap((r) => (r.book_list_items ?? []).map((item) => item.book_id))
    )
  );
  const { data: categoryRows } = listedBookIds.length
    ? await supabase.from("book_categories").select("book_id, category").in("book_id", listedBookIds)
    : { data: [] };
  const categoriesByBook = new Map<string, string[]>();
  for (const row of categoryRows ?? []) {
    const list = categoriesByBook.get(row.book_id) ?? [];
    list.push(row.category);
    categoriesByBook.set(row.book_id, list);
  }

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
        categories: categoriesByBook.get(item.books!.id) ?? [],
        addedAt: item.created_at,
        readCount: readersByGroupBook.get(`${group.id}:${item.books!.id}`)?.size ?? 0,
        inAssignment: assignedByGroup.get(group.id)?.has(item.books!.id) ?? false,
      }))
      // 최근에 올린 책이 위(육아 기록 앱의 목록처럼 날짜순).
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    return { id: group.id, name: group.name, memberCount: memberCountByGroup.get(group.id) ?? 0, books };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="d text-xl">추천도서</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            그룹마다 책 서랍이 하나씩 있어요. 오른쪽 숫자는 우리 아이들 중 몇 명이 읽었는지예요.
          </p>
        </div>
        {/* 숲지기 한 명이 그룹을 여러 개 운영할 수 있다(7살 추천도서, 6살 추천도서 …).
            빈 상태에서만 보이던 만들기 링크를 항상 보이는 버튼으로. */}
        <Link
          href="/recommend/create"
          className="d flex-none rounded-[14px] px-3 py-2 text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          + 새 그룹
        </Link>
      </div>

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
        <div className="mt-6 flex flex-col gap-4">
          {sections.map((section) => (
            <LogGroup
              key={section.id}
              heading={section.name}
              headingSub={`${section.books.length}권`}
              headingRight={
                <Link href={`/teacher/books/add?group=${section.id}`} className="d" style={{ color: "var(--point)" }}>
                  + 책 추가
                </Link>
              }
            >
              {section.books.length === 0 ? (
                <p className="px-4 pb-4 text-sm" style={{ color: "var(--ink-2)" }}>
                  아직 추천도서가 없어요. 위의 ‘+ 책 추가’로 올려 주세요.
                </p>
              ) : (
                section.books.map((book, index) => {
                  const [firstCategory, secondCategory] = book.categories;
                  const sameDayAsPrev =
                    index > 0 && section.books[index - 1].addedAt.slice(0, 10) === book.addedAt.slice(0, 10);
                  return (
                    <LogRow
                      key={book.bookId}
                      first={index === 0}
                      hideDate={sameDayAsPrev}
                      href={`/teacher/books/${book.bookId}?group=${section.id}`}
                      dateTop={shortMd(book.addedAt)}
                      chip={{ label: firstCategory ?? "책", color: categoryColor(firstCategory), sub: secondCategory }}
                      title={book.title}
                      subtitle={
                        book.author || book.inAssignment ? (
                          <>
                            {book.inAssignment && (
                              <span className="mr-1.5 inline-flex items-center gap-0.5 align-middle" style={{ color: "var(--lantern)" }}>
                                <Illustration name="lantern-on" height={13} />
                                숙제 중
                              </span>
                            )}
                            {book.author}
                          </>
                        ) : undefined
                      }
                      right={
                        <span className="d text-xs" style={{ color: book.readCount > 0 ? "var(--point-deep)" : "var(--ink-2)" }}>
                          {book.readCount}/{section.memberCount}명
                        </span>
                      }
                    />
                  );
                })
              )}
            </LogGroup>
          ))}
        </div>
      )}
    </div>
  );
}
