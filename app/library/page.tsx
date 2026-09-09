import Link from "next/link";
import { AvatarIllustration } from "@/components/illustration";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import LibraryShelf, { type ShelfBook } from "@/components/library-shelf";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialMode = view === "list" || view === "spine" || view === "cover" ? view : undefined;
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

  const { data: records, error: recordsError } = activeChild
    ? await supabase
        .from("reading_records")
        .select(
          "id, group_id, status, rating, emotion, favorite, parent_memo, read_date, pages_read, photo_url, voice_url, shelf_tag_id, books(id, title, author, cover_url), groups(name), shelf_tags(name)"
        )
        .eq("child_id", activeChild.id)
        .order("read_date", { ascending: false })
    : { data: null, error: null };

  // 같은 책을 여러 그룹의 숙제로 각각 기록했을 수 있으므로(child_id+book_id
  // 조합이 중복될 수 있음), 책 단위로 묶어 책장에는 책마다 한 장만 뜨게 한다
  // -- 그룹별 기록은 ShelfBook.instances 안에 전부 들어있어 필터로 골라볼 수 있다.
  const byBook = new Map<string, ShelfBook>();
  for (const record of records ?? []) {
    const book = record.books as unknown as {
      id: string;
      title: string;
      author: string | null;
      cover_url: string | null;
    } | null;
    if (!book) continue;

    const group = record.groups as unknown as { name: string } | null;
    const shelfTag = record.shelf_tags as unknown as { name: string } | null;
    const instance = {
      recordId: record.id,
      groupId: record.group_id,
      groupName: group?.name ?? null,
      shelfTagId: record.shelf_tag_id,
      shelfTagName: shelfTag?.name ?? null,
      favorite: record.favorite,
      status: record.status as ShelfBook["instances"][number]["status"],
      rating: record.rating,
      emotion: record.emotion,
      memo: record.parent_memo,
      readDate: record.read_date,
      pagesRead: record.pages_read,
      photoPath: record.photo_url,
      voicePath: record.voice_url,
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

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      {!activeChild && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 책장이 시작돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      )}

      {/* 조회 자체가 실패했을 때 "책장이 비었어요"로 보이면 데이터가 사라진
          줄 알고 놀라게 된다(예: DB 마이그레이션이 아직 안 된 상태) --
          빈 상태와 오류를 구분해서 보여준다. */}
      {recordsError && (
        <p className="mt-6 text-sm" style={{ color: "var(--berry)" }}>
          책장을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. ({recordsError.message})
        </p>
      )}

      {activeChild && !recordsError && books.length === 0 && (
        <div className="mt-6">
          <AvatarIllustration avatar={activeChild.avatar} height={120} />
          <p className="hand mt-3 text-lg" style={{ color: "var(--point-deep)" }}>
            책장이 비었어요. 첫 책을 기록해 보세요.
          </p>
          <Link
            href="/library/add"
            className="d mt-3 inline-block rounded-[14px] px-4 py-2 text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            + 책
          </Link>
        </div>
      )}

      {activeChild && books.length > 0 && (
        <LibraryShelf childId={activeChild.id} childName={activeChild.name} books={books} initialMode={initialMode} />
      )}
    </div>
  );
}
