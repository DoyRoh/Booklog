import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";
import LibraryShelf, { type ShelfBook } from "@/components/library-shelf";
import { FootprintIcon } from "@/components/icons/misc-icons";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">책장</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, user.id);

  const { data: records } = activeChild
    ? await supabase
        .from("reading_records")
        .select("id, status, favorite, read_date, books(id, title, author, cover_url)")
        .eq("child_id", activeChild.id)
        .order("read_date", { ascending: false })
    : { data: null };

  const books: ShelfBook[] = (records ?? [])
    .map((record) => {
      const book = record.books as unknown as {
        id: string;
        title: string;
        author: string | null;
        cover_url: string | null;
      } | null;
      if (!book) return null;
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        favorite: record.favorite,
        status: record.status as ShelfBook["status"],
      };
    })
    .filter((book): book is ShelfBook => Boolean(book));

  // 발자국은 "다 읽은 책"에만 찍힌다 -- 읽고 싶은 책/읽는 중인 책까지 세면
  // 탐험 수첩 모티프의 의미가 흐려진다.
  const footprintCount = books.filter((book) => book.status === "done").length;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="d text-xl">책장</h1>
          {activeChild && (
            <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "var(--ink-2)" }}>
              <FootprintIcon width={14} height={14} />
              {activeChild.name}의 발자국 {footprintCount}개
            </p>
          )}
        </div>
        <Link
          href="/library/add"
          className="d rounded-[14px] px-4 py-2 text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          + 책 등록
        </Link>
      </div>

      {!activeChild && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 책장이 시작돼요. 더보기 탭에서 아이를 추가해 주세요.
        </p>
      )}

      {activeChild && books.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          책장이 비었어요. &ldquo;+ 책 등록&rdquo;으로 첫 책을 등록해 보세요.
        </p>
      )}

      {activeChild && books.length > 0 && <LibraryShelf books={books} />}
    </div>
  );
}
