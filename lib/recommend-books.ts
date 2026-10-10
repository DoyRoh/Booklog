import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadingStatus } from "@/lib/reading-status";
import { kstDate } from "@/lib/kst";

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
  /** 목록에 올린 날짜(ISO). 목록 줄의 날짜 칸. */
  addedAt: string;
  /** 여러 그룹을 합쳐 볼 때(숲길 "전체") 이 책이 어느 그룹 것인지. */
  groupId?: string;
  /** 이 책이 들어 있는 추천 목록 id들(그룹 하나 안에서, 같은 책이 여러 목록에 있을 수 있다). */
  listIds: string[];
};

/** 그룹 안의 추천 목록(자동차 좋아하는 친구, 영어 그림책 …). 만든 순서대로. */
export type RecommendList = { id: string; name: string; description: string | null };

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
): Promise<{ bookListId: string | null; lists: RecommendList[]; books: RecommendBook[] }> {
  // 그룹 하나에 추천 목록이 여러 개일 수 있다(사용자 요청: "자동차 좋아하는
  // 아이들용 / 영어책 / 연령대별"). 목록 행과 그 안의 책들을 임베드로 한 번에.
  // 숲길 "전체"는 그룹마다 이 함수를 부르니 왕복을 늘리지 않는다.
  const { data: listRows } = await supabase
    .from("book_lists")
    .select("id, name, description, created_at, book_list_items(id, created_at, books(id, title, author, cover_url))")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  type ItemRow = { id: string; created_at: string; books: { id: string; title: string; author: string | null; cover_url: string | null } | null };
  const rows = (listRows ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    book_list_items: ItemRow[] | null;
  }[];
  const lists: RecommendList[] = rows.map((l) => ({ id: l.id, name: l.name, description: l.description }));

  if (rows.length === 0) {
    return { bookListId: null, lists, books: [] };
  }

  // 같은 책이 여러 목록에 있으면 한 권으로 합치고, 어느 목록들에 있는지만 모은다.
  // 대표 행(itemId·올린 날짜)은 가장 최근에 올린 것.
  const byBook = new Map<string, { id: string; addedAt: string; book: NonNullable<ItemRow["books"]>; listIds: string[] }>();
  for (const list of rows) {
    for (const item of list.book_list_items ?? []) {
      if (!item.books) continue;
      const prev = byBook.get(item.books.id);
      if (!prev) {
        byBook.set(item.books.id, { id: item.id, addedAt: item.created_at, book: item.books, listIds: [list.id] });
      } else {
        prev.listIds.push(list.id);
        if (item.created_at > prev.addedAt) {
          prev.id = item.id;
          prev.addedAt = item.created_at;
        }
      }
    }
  }
  const items = Array.from(byBook.values()).sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  const listedBookIds = items.map((row) => row.book!.id);
  const today = kstDate();

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
    addedAt: row.addedAt,
    listIds: row.listIds,
  }));

  return { bookListId: rows[0].id, lists, books };
}
