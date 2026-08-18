import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";

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

  const { data: records } = activeChild
    ? await supabase
        .from("reading_records")
        .select("id, rating, emotion, favorite, parent_memo, read_date, books(title, author, cover_url)")
        .eq("child_id", activeChild.id)
        .order("read_date", { ascending: false })
    : { data: null };

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8">
      <h1 className="d text-xl">기록</h1>
      {activeChild && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
          {activeChild.name}의 독서기록
        </p>
      )}

      {!activeChild && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 독서기록이 시작돼요. 더보기 탭에서 아이를 추가해 주세요.
        </p>
      )}

      {activeChild && (!records || records.length === 0) && (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 기록이 없어요. 책장에서 책을 등록하면 여기에 기록이 쌓여요.
        </p>
      )}

      {activeChild && records && records.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {records.map((record) => {
            const book = record.books as unknown as {
              title: string;
              author: string | null;
              cover_url: string | null;
            } | null;
            if (!book) return null;
            return (
              <div
                key={record.id}
                className="flex gap-3 rounded-[var(--r)] border p-4"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                {book.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover_url}
                    alt=""
                    className="h-20 w-14 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="d text-sm">{book.title}</p>
                    {record.favorite && (
                      <span className="text-xs" style={{ color: "var(--berry)" }}>
                        즐겨찾는 책
                      </span>
                    )}
                  </div>
                  {book.author && (
                    <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                      {book.author}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                    <span>{record.read_date}</span>
                    {record.rating && <span>· 평점 {record.rating}</span>}
                    {record.emotion && <span>· {record.emotion}</span>}
                  </div>
                  {record.parent_memo && (
                    <p className="mt-2 text-sm" style={{ color: "var(--ink)" }}>
                      {record.parent_memo}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
