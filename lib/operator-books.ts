/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortMd } from "@/components/log-row";
import type { ManagedRow } from "@/components/managed-log-list";
import { categoryColor } from "@/lib/categories";
import { parseAgeBands, type AgeBand } from "@/lib/age-bands";
import { isCurrent } from "@/lib/assignment-period";
import { operatorGroupsQuery } from "@/lib/operator-groups";

export type OperatorBook = {
  itemId: string;
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  categories: string[];
  /** 추천 연령(0038). 비어 있으면 연령 미정. */
  ageBands: AgeBand[];
  addedAt: string;
  readCount: number;
  inAssignment: boolean;
  /** 숲지기의 추천 메모(0039). */
  note: string;
};

export type OperatorBookSection = {
  id: string;
  name: string;
  /** 그룹의 추천도서 목록(book_lists) id -- 표에서 바로 책을 올릴 때 쓴다. */
  listId: string | null;
  memberCount: number;
  books: OperatorBook[];
};

type ItemRow = {
  id: string;
  book_id: string;
  created_at: string;
  age_bands: string[] | null;
  note?: string | null;
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
  book_lists: { id: string; book_list_items: ItemRow[] | null }[] | null;
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
  const run = (withAge: boolean, withNote: boolean) => {
    let query = operatorGroupsQuery(
      supabase,
      userId,
      `book_lists(id, book_list_items(id, book_id, created_at, ${withAge ? "age_bands, " : ""}${withNote ? "note, " : ""}books(id, title, author, cover_url, book_categories(category)))), members:group_members(child_id, status), reading_records(child_id, book_id), assignments(start_date, end_date, created_at, assignment_books(book_id))`
    ).eq("reading_records.status", "done");
    if (groupId) query = query.eq("id", groupId);
    return query.overrideTypes<GroupRow[], { merge: false }>();
  };
  // 마이그레이션 0038(age_bands) 전이면 그 컬럼 없이 다시 -- 조회 실패를
  // "운영하는 그룹이 없어요"로 위장하지 않게(실제로 그렇게 보였던 버그).
  let { data, error } = await run(true, true);
  if (error) ({ data, error } = await run(true, false));
  if (error) ({ data, error } = await run(false, false));
  if (error) throw error;

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
        ageBands: parseAgeBands(item.age_bands),
        addedAt: item.created_at,
        readCount: readersByBook.get(item.books!.id)?.size ?? 0,
        inAssignment: assigned.has(item.books!.id),
        note: item.note ?? "",
      }))
      // 최근에 올린 책이 위(육아 기록 앱의 목록처럼 날짜순).
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    const memberCount = (group.members ?? []).filter((m) => m.status === "approved" && m.child_id).length;
    return { id: group.id, name: group.name, listId: group.book_lists?.[0]?.id ?? null, memberCount, books };
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
