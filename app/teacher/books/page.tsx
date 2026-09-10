import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { shortMd } from "@/components/log-row";
import ManagedLogList, { type ManagedRow } from "@/components/managed-log-list";
import { categoryColor } from "@/lib/categories";
import { isCurrent } from "@/lib/assignment-period";
import { operatorGroupsQuery } from "@/lib/operator-groups";

type BookCard = {
  itemId: string;
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

  // 운영 그룹 + 추천도서(+분야) + 그룹원 수 + 완독 기록 + 숙제를 임베드 한
  // 번으로(예전엔 세 번 순차 왕복: 그룹 → 그룹별 데이터 → 분야).
  type ItemRow = {
    id: string;
    book_id: string;
    created_at: string;
    books: {
      id: string;
      title: string;
      author: string | null;
      cover_url: string | null;
      book_categories: { category: string }[] | null;
    } | null;
  };
  type GroupRow = {
    id: string;
    name: string;
    book_lists: { book_list_items: ItemRow[] | null }[] | null;
    members: { child_id: string | null; status: string }[] | null;
    reading_records: { child_id: string; book_id: string }[] | null;
    assignments: {
      start_date: string | null;
      end_date: string | null;
      created_at: string;
      assignment_books: { book_id: string }[] | null;
    }[] | null;
  };
  const { data: groupRows } = await operatorGroupsQuery(
    supabase,
    userId,
    "book_lists(book_list_items(id, book_id, created_at, books(id, title, author, cover_url, book_categories(category)))), members:group_members(child_id, status), reading_records(child_id, book_id), assignments(start_date, end_date, created_at, assignment_books(book_id))"
  )
    .eq("reading_records.status", "done")
    .overrideTypes<GroupRow[], { merge: false }>();
  const groups = groupRows ?? [];

  const sections: GroupSection[] = groups.map((group) => {
    // 책 → 읽은 아이 집합
    const readersByBook = new Map<string, Set<string>>();
    for (const row of group.reading_records ?? []) {
      const set = readersByBook.get(row.book_id) ?? new Set<string>();
      set.add(row.child_id);
      readersByBook.set(row.book_id, set);
    }
    // 지금 진행 중인 숙제에 들어간 책(기간 규칙은 lib/assignment-period).
    const assigned = new Set<string>();
    for (const a of group.assignments ?? []) {
      if (!isCurrent({ startDate: a.start_date, endDate: a.end_date, createdAt: a.created_at })) continue;
      for (const b of a.assignment_books ?? []) assigned.add(b.book_id);
    }
    const books: BookCard[] = (group.book_lists ?? [])
      .flatMap((l) => l.book_list_items ?? [])
      .filter((item) => item.books)
      .map((item) => ({
        itemId: item.id,
        bookId: item.books!.id,
        title: item.books!.title,
        author: item.books!.author,
        coverUrl: item.books!.cover_url,
        categories: (item.books!.book_categories ?? []).map((c) => c.category),
        addedAt: item.created_at,
        readCount: readersByBook.get(item.books!.id)?.size ?? 0,
        inAssignment: assigned.has(item.books!.id),
      }))
      // 최근에 올린 책이 위(육아 기록 앱의 목록처럼 날짜순).
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    const memberCount = (group.members ?? []).filter((m) => m.status === "approved" && m.child_id).length;
    return { id: group.id, name: group.name, memberCount, books };
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
          {sections.map((section) => {
            const rows: ManagedRow[] = section.books.map((book, index) => {
              const [firstCategory, secondCategory] = book.categories;
              return {
                id: book.itemId,
                href: `/teacher/books/${book.bookId}?group=${section.id}`,
                dateTop: shortMd(book.addedAt),
                hideDate: index > 0 && section.books[index - 1].addedAt.slice(0, 10) === book.addedAt.slice(0, 10),
                chip: { label: firstCategory ?? "책", color: categoryColor(firstCategory), sub: secondCategory },
                title: book.title,
                subtitle: book.author ?? undefined,
                lantern: book.inAssignment,
                right: `${book.readCount}/${section.memberCount}명`,
                rightTone: book.readCount > 0 ? "good" : "muted",
              };
            });
            return (
              <ManagedLogList
                key={section.id}
                heading={section.name}
                headingSub={`${section.books.length}권`}
                addHref={`/teacher/books/add?group=${section.id}`}
                addLabel="+ 책 추가"
                rows={rows}
                emptyText="아직 추천도서가 없어요. 위의 ‘+ 책 추가’로 올려 주세요."
                table="book_list_items"
                deleteNoun="추천도서에서 뺄까요? (아이들의 기록은 남아요)"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
