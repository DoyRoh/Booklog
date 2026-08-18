import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";

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
        .select("id, rating, favorite, read_date, books(id, title, cover_url)")
        .eq("child_id", activeChild.id)
        .order("read_date", { ascending: false })
    : { data: null };

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="d text-xl">책장</h1>
          {activeChild && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
              {activeChild.name}의 책장
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

      {activeChild && (!records || records.length === 0) && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          책장이 비었어요. &ldquo;+ 책 등록&rdquo;으로 첫 책을 등록해 보세요.
        </p>
      )}

      {activeChild && records && records.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {records.map((record) => {
            const book = record.books as unknown as {
              id: string;
              title: string;
              cover_url: string | null;
            } | null;
            if (!book) return null;
            return (
              <div key={record.id} className="flex flex-col gap-1.5">
                <div
                  className="aspect-[3/4] overflow-hidden rounded-[10px]"
                  style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
                >
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center">
                      <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
                        {book.title}
                      </span>
                    </div>
                  )}
                </div>
                <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                  {book.title}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
