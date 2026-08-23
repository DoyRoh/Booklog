import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import RecordsList, { type RecordRow } from "@/components/records-list";

export default async function RecordsPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">기록</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);

  // 기록 탭은 "다 읽은 책"에 대한 기록 로그다 -- 읽고 싶은 책/읽는 중인
  // 책은 책장 탭에서 상태 필터로 보고, 여기서는 status='done'만 다룬다.
  const { data: rows } = activeChild
    ? await supabase
        .from("reading_records")
        .select(
          "id, group_id, status, rating, emotion, favorite, parent_memo, read_date, pages_read, photo_url, voice_url, books(title, author, cover_url), groups(name)"
        )
        .eq("child_id", activeChild.id)
        .eq("status", "done")
        .order("read_date", { ascending: false })
    : { data: null };

  const records: RecordRow[] = (rows ?? []).map((row) => {
    const book = row.books as unknown as {
      title: string;
      author: string | null;
      cover_url: string | null;
    } | null;
    const group = row.groups as unknown as { name: string } | null;
    return {
      id: row.id,
      groupId: row.group_id,
      groupName: group?.name ?? null,
      status: row.status,
      rating: row.rating,
      emotion: row.emotion,
      favorite: row.favorite,
      parentMemo: row.parent_memo,
      readDate: row.read_date,
      pagesRead: row.pages_read,
      photoPath: row.photo_url,
      voicePath: row.voice_url,
      bookTitle: book?.title ?? "",
      bookAuthor: book?.author ?? null,
      bookCoverUrl: book?.cover_url ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      {activeChild && (
        <Link
          href="/library/add"
          className="d block rounded-[14px] py-3.5 text-center text-base text-white"
          style={{ background: "var(--berry)" }}
        >
          + 책 기록하기
        </Link>
      )}

      {!activeChild && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 독서기록이 시작돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      )}

      {activeChild && records.length === 0 && (
        <p className="hand mt-6 text-lg" style={{ color: "var(--point-deep)" }}>
          아직 기록이 없어요. 책장에서 책을 등록하면 여기에 기록이 쌓여요.
        </p>
      )}

      {activeChild && records.length > 0 && (
        <RecordsList childId={activeChild.id} childName={activeChild.name} records={records} />
      )}
    </div>
  );
}
