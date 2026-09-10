/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortMd } from "@/components/log-row";
import type { ManagedRow } from "@/components/managed-log-list";
import { categoryColor } from "@/lib/categories";
import { isCurrent } from "@/lib/assignment-period";
import { operatorGroupsQuery } from "@/lib/operator-groups";

export type OperatorBook = {
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

export type OperatorBookSection = { id: string; name: string; memberCount: number; books: OperatorBook[] };

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

/**
 * 숲지기가 운영하는 그룹별 추천도서(+분야·읽은 아이 수·숙제 중 여부)를
 * 임베드 한 번으로. 추천도서 탭(그룹별 미리보기)과 그룹별 관리 화면이
 * 같이 쓴다. groupId를 주면 그 그룹만.
 */
export async function loadOperatorBookSections(
  supabase: SupabaseClient<any>,
  userId: string,
  groupId?: string
): Promise<OperatorBookSection[]> {
  let query = operatorGroupsQuery(
    supabase,
    userId,
    "book_lists(book_list_items(id, book_id, created_at, books(id, title, author, cover_url, book_categories(category)))), members:group_members(child_id, status), reading_records(child_id, book_id), assignments(start_date, end_date, created_at, assignment_books(book_id))"
  ).eq("reading_records.status", "done");
  if (groupId) query = query.eq("id", groupId);
  const { data } = await query.overrideTypes<GroupRow[], { merge: false }>();

  return (data ?? []).map((group) => {
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
    const books: OperatorBook[] = (group.book_lists ?? [])
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
}

/** 목록 줄(날짜 · 분야 칩 · 제목/작가 · N/M명)로 바꾼다. */
export function operatorBookRows(section: OperatorBookSection, books: OperatorBook[] = section.books): ManagedRow[] {
  return books.map((book, index) => {
    const [firstCategory, secondCategory] = book.categories;
    return {
      id: book.itemId,
      href: `/teacher/books/${book.bookId}?group=${section.id}`,
      dateTop: shortMd(book.addedAt),
      hideDate: index > 0 && books[index - 1].addedAt.slice(0, 10) === book.addedAt.slice(0, 10),
      chip: { label: firstCategory ?? "책", color: categoryColor(firstCategory), sub: secondCategory },
      title: book.title,
      subtitle: book.author ?? undefined,
      lantern: book.inAssignment,
      right: `${book.readCount}/${section.memberCount}명`,
      rightTone: book.readCount > 0 ? "good" : "muted",
    };
  });
}
