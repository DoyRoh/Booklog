import type { SupabaseClient } from "@supabase/supabase-js";

export type RecommendBook = {
  itemId: string;
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  categories: string[];
  required: boolean;
  inShelf: boolean;
};

/**
 * 그룹 하나의 추천도서 목록(+분야, 이 아이의 책장 보유 여부)을 조회한다.
 * 추천 탭의 그룹 상세 화면과 숙제 탭(그룹 필터 선택 시)이 똑같은 데이터를
 * 똑같은 모양으로 써야 해서 한 곳으로 뺐다.
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
    .select("id, required, books(id, title, author, cover_url)")
    .eq("book_list_id", bookList.id);

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

  const [{ data: categoryRows }, { data: shelfRows }] = await Promise.all([
    listedBookIds.length
      ? supabase.from("book_categories").select("book_id, category").in("book_id", listedBookIds)
      : Promise.resolve({ data: [] }),
    childId && listedBookIds.length
      ? supabase.from("reading_records").select("book_id").eq("child_id", childId).in("book_id", listedBookIds)
      : Promise.resolve({ data: [] }),
  ]);

  const categoriesByBook = new Map<string, string[]>();
  for (const row of categoryRows ?? []) {
    const list = categoriesByBook.get(row.book_id) ?? [];
    list.push(row.category);
    categoriesByBook.set(row.book_id, list);
  }

  const shelvedBookIds = new Set((shelfRows ?? []).map((row) => row.book_id));

  const books: RecommendBook[] = items.map((row) => ({
    itemId: row.id,
    bookId: row.book!.id,
    title: row.book!.title,
    author: row.book!.author,
    coverUrl: row.book!.cover_url,
    categories: categoriesByBook.get(row.book!.id) ?? [],
    required: row.required,
    inShelf: shelvedBookIds.has(row.book!.id),
  }));

  return { bookListId: bookList.id, listName: bookList.name, books };
}
