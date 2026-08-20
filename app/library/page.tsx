import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import LibraryShelf, { type ShelfBook } from "@/components/library-shelf";
import { FootprintIcon } from "@/components/icons/misc-icons";

export default async function LibraryPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">책장</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);

  const { data: records } = activeChild
    ? await supabase
        .from("reading_records")
        .select(
          "id, group_id, status, rating, emotion, favorite, parent_memo, read_date, pages_read, books(id, title, author, cover_url), groups(name)"
        )
        .eq("child_id", activeChild.id)
        .order("read_date", { ascending: false })
    : { data: null };

  // 같은 책을 여러 그룹의 숙제로 각각 기록했을 수 있으므로(child_id+book_id
  // 조합이 중복될 수 있음), 책 단위로 묶어 책장에는 책마다 한 장만 뜨게 한다
  // -- 그룹별 기록은 ShelfBook.instances 안에 전부 들어있어 필터로 골라볼 수 있다.
  const byBook = new Map<string, ShelfBook>();
  const doneBookIds = new Set<string>();
  for (const record of records ?? []) {
    const book = record.books as unknown as {
      id: string;
      title: string;
      author: string | null;
      cover_url: string | null;
    } | null;
    if (!book) continue;
    if (record.status === "done") doneBookIds.add(book.id);

    const group = record.groups as unknown as { name: string } | null;
    const instance = {
      recordId: record.id,
      groupId: record.group_id,
      groupName: group?.name ?? null,
      favorite: record.favorite,
      status: record.status as ShelfBook["instances"][number]["status"],
      rating: record.rating,
      emotion: record.emotion,
      memo: record.parent_memo,
      readDate: record.read_date,
      pagesRead: record.pages_read,
    };

    const existing = byBook.get(book.id);
    if (existing) {
      existing.instances.push(instance);
    } else {
      byBook.set(book.id, {
        bookId: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        instances: [instance],
      });
    }
  }
  const books: ShelfBook[] = Array.from(byBook.values());

  // 발자국은 "다 읽은 책"에만 찍힌다 -- 읽고 싶은 책/읽는 중인 책까지 세면
  // 탐험 수첩 모티프의 의미가 흐려지고, 같은 책을 여러 그룹 숙제로 두 번
  // 완독 기록해도 책 자체는 한 권이므로 중복 집계하지 않는다.
  const footprintCount = doneBookIds.size;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <div className="flex items-center justify-between">
        {activeChild ? (
          <Link
            href="/badges"
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--ink-2)" }}
          >
            <FootprintIcon width={14} height={14} />
            {activeChild.name}의 발자국 {footprintCount}개 · 배지 보기
          </Link>
        ) : (
          <span />
        )}
        <Link
          href="/library/add"
          className="d rounded-[14px] px-4 py-2 text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          + 책장에 책 꽂기
        </Link>
      </div>

      {!activeChild && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 책장이 시작돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      )}

      {activeChild && books.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          책장이 비었어요. &ldquo;+ 책장에 책 꽂기&rdquo;로 첫 책을 기록해 보세요.
        </p>
      )}

      {activeChild && books.length > 0 && <LibraryShelf books={books} />}
    </div>
  );
}
