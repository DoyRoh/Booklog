import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";
import { getSignedMediaUrl } from "@/lib/storage";
import RecordsList, { type RecordRow } from "@/components/records-list";

export default async function RecordsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">기록</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, user.id);

  const { data: rows } = activeChild
    ? await supabase
        .from("reading_records")
        .select(
          "id, status, rating, emotion, favorite, parent_memo, read_date, photo_url, voice_url, books(title, author, cover_url)"
        )
        .eq("child_id", activeChild.id)
        .order("read_date", { ascending: false })
    : { data: null };

  const records: RecordRow[] = rows
    ? await Promise.all(
        rows.map(async (row) => {
          const book = row.books as unknown as {
            title: string;
            author: string | null;
            cover_url: string | null;
          } | null;
          return {
            id: row.id,
            status: row.status,
            rating: row.rating,
            emotion: row.emotion,
            favorite: row.favorite,
            parentMemo: row.parent_memo,
            readDate: row.read_date,
            photoSignedUrl: row.photo_url ? await getSignedMediaUrl(supabase, row.photo_url) : null,
            voiceSignedUrl: row.voice_url ? await getSignedMediaUrl(supabase, row.voice_url) : null,
            bookTitle: book?.title ?? "",
            bookAuthor: book?.author ?? null,
            bookCoverUrl: book?.cover_url ?? null,
          };
        })
      )
    : [];

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="d text-xl">기록</h1>
        {activeChild && (
          <Link
            href="/library/add"
            className="d rounded-[14px] px-4 py-2 text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            책 기록하기
          </Link>
        )}
      </div>

      {!activeChild && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 독서기록이 시작돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      )}

      {activeChild && records.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 기록이 없어요. 책장에서 책을 등록하면 여기에 기록이 쌓여요.
        </p>
      )}

      {activeChild && records.length > 0 && (
        <RecordsList childName={activeChild.name} records={records} />
      )}
    </div>
  );
}
