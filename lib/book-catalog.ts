import type { SupabaseClient } from "@supabase/supabase-js";

/** 검색·스캔·직접 입력으로 고른 책 후보(카탈로그에 있든 없든). */
export type BookCandidate = {
  title: string;
  author: string;
  coverUrl: string | null;
  isbn: string;
};

// 후보를 공유 카탈로그(books/book_isbns)의 행 하나로 바꾼다 -- ISBN이
// 이미 있으면 그 책을 재사용하고, 없으면 새로 만든다. 추천도서 올리기와
// 숙제 만들기가 같은 규칙을 쓰도록 한 곳에 뒀다.
export async function ensureBook(
  supabase: SupabaseClient,
  candidate: BookCandidate
): Promise<{ id: string } | { error: string }> {
  if (candidate.isbn) {
    const { data: existing } = await supabase
      .from("book_isbns")
      .select("book_id")
      .eq("isbn", candidate.isbn)
      .maybeSingle();
    if (existing) return { id: existing.book_id as string };
  }

  const id = crypto.randomUUID();
  const { error: bookError } = await supabase.from("books").insert({
    id,
    title: candidate.title,
    author: candidate.author || null,
    cover_url: candidate.coverUrl,
    source: candidate.isbn ? "kakao" : "manual",
  });
  if (bookError) return { error: bookError.message };

  if (candidate.isbn) {
    const { error: isbnError } = await supabase.from("book_isbns").insert({ book_id: id, isbn: candidate.isbn });
    if (isbnError) return { error: isbnError.message };
  }
  return { id };
}
