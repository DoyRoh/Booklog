import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadingStatus } from "@/lib/reading-status";

export type RecommendBook = {
  itemId: string;
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  categories: string[];
  /** 이 아이가 이 책을 어디까지 읽었는지(기록이 없으면 null). done > reading > want 중 가장 앞선 것. */
  readStatus: ReadingStatus | null;
  /** 지금 진행 중인 숙제에 들어 있는 책인지 -- 목록에 "숙제 중" 등불 표시. */
  inAssignment: boolean;
};

const STATUS_RANK: Record<ReadingStatus, number> = { want: 0, reading: 1, done: 2 };

/**
 * 그룹 하나의 추천도서 목록(+분야, 이 아이의 읽기 상태, 진행 중 숙제 여부)을
 * 조회한다. 추천도서 = 그룹의 "책 서랍"(기간·강제 없음), 숙제 = 그 서랍에서
 * 골라 기간을 정해 내는 것 -- 이 함수는 서랍 쪽을 담당하고, 숙제 쪽은
 * lib/assignments.ts가 담당한다. 그룹 상세 화면, 숲길 탭, 숲지기의 아이별
 * 상세 화면이 똑같은 데이터를 써야 해서 한 곳으로 뺐다.
 */
export async function getRecommendBooks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  groupId: string,
  childId: string | null
): Promise<{ bookListId: string | null; listName: string; books: RecommendBook[] }> {
  const { data: bookList } = await supabase
    .from("book_lists")
    .select("id, name")
    .eq("group_id", groupId)
    .limit(1)
    .maybeSingle();

  if (!bookList) {
    return { bookListId: null, listName: "추천도서", books: [] };
  }

  const { data: itemRows } = await supabase
    .from("book_list_items")
    .select("id, books(id, title, author, cover_url)")
    .eq("book_list_id", bookList.id);

  const items = (itemRows ?? [])
    .map((row) => ({
      id: row.id,
      book: row.books as unknown as
        | { id: string; title: string; author: string | null; cover_url: string | null }
        | null,
    }))
    .filter((row) => row.book);

  const listedBookIds = items.map((row) => row.book!.id);
  const today = new Date().toISOString().slice(0, 10);

  // 분야, 아이의 읽기 기록, 진행 중인 숙제의 책 목록 -- 셋 다 서로 무관해서
  // 동시에 왕복한다.
  const [{ data: categoryRows }, { data: recordRows }, { data: activeAssignmentRows }] = await Promise.all([
    listedBookIds.length
      ? supabase.from("book_categories").select("book_id, category").in("book_id", listedBookIds)
      : Promise.resolve({ data: [] }),
    childId && listedBookIds.length
      ? supabase.from("reading_records").select("book_id, status").eq("child_id", childId).in("book_id", listedBookIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("assignments")
      .select("assignment_books(book_id)")
      .eq("group_id", groupId)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`),
  ]);

  const categoriesByBook = new Map<string, string[]>();
  for (const row of categoryRows ?? []) {
    const list = categoriesByBook.get(row.book_id) ?? [];
    list.push(row.category);
    categoriesByBook.set(row.book_id, list);
  }

  const statusByBook = new Map<string, ReadingStatus>();
  for (const row of recordRows ?? []) {
    const status = row.status as ReadingStatus;
    const prev = statusByBook.get(row.book_id);
    if (!prev || STATUS_RANK[status] > STATUS_RANK[prev]) statusByBook.set(row.book_id, status);
  }

  const assignedBookIds = new Set<string>();
  for (const row of activeAssignmentRows ?? []) {
    const books = (row.assignment_books as unknown as { book_id: string }[] | null) ?? [];
    for (const b of books) assignedBookIds.add(b.book_id);
  }

  const books: RecommendBook[] = items.map((row) => ({
    itemId: row.id,
    bookId: row.book!.id,
    title: row.book!.title,
    author: row.book!.author,
    coverUrl: row.book!.cover_url,
    categories: categoriesByBook.get(row.book!.id) ?? [],
    readStatus: statusByBook.get(row.book!.id) ?? null,
    inAssignment: assignedBookIds.has(row.book!.id),
  }));

  return { bookListId: bookList.id, listName: bookList.name, books };
}
