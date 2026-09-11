import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { AvatarIllustration, PawStamp } from "@/components/illustration";
import type { ReadingStatus } from "@/lib/reading-status";

const RANK: Record<ReadingStatus, number> = { want: 0, reading: 1, done: 2 };
const LABEL: Record<ReadingStatus, string> = { done: "읽었어요", reading: "읽는 중", want: "읽고 싶어요" };

// 책 한 권을 그룹 아이들이 각각 어디까지 읽었는지. 추천도서 탭에서 책을
// 눌렀을 때.
export default async function TeacherBookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { bookId } = await params;
  const { group: groupId } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId || !groupId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href={groupId ? `/teacher/books?group=${groupId}` : "/teacher/books"} className="text-sm" style={{ color: "var(--point)" }}>
          ← 추천도서
        </Link>
      </div>
    );
  }

  const [{ data: membership }, { data: group }, { data: book }] = await Promise.all([
    supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .in("role", ["teacher", "admin", "curator"])
      .maybeSingle(),
    supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
    supabase.from("books").select("id, title, author, cover_url").eq("id", bookId).maybeSingle(),
  ]);

  if (!membership || !group || !book) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href={`/teacher/books?group=${groupId}`} className="text-sm" style={{ color: "var(--ink-2)" }}>
          ← 추천도서
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          이 책 정보를 볼 수 없어요.
        </p>
      </div>
    );
  }

  type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null };
  const [{ data: memberRows }, { data: recordRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("group_members")
      .select("children(id, name, avatar)")
      .eq("group_id", groupId)
      .eq("status", "approved")
      .not("child_id", "is", null),
    supabase
      .from("reading_records")
      .select("child_id, status, read_date, pages_read")
      .eq("group_id", groupId)
      .eq("book_id", bookId),
    supabase
      .from("assignments")
      .select("id, title, assignment_books!inner(book_id)")
      .eq("group_id", groupId)
      .eq("assignment_books.book_id", bookId),
  ]);

  const children = (memberRows ?? [])
    .map((row) => row.children as unknown as ChildRow | null)
    .filter((c): c is ChildRow => Boolean(c));

  const best = new Map<string, { status: ReadingStatus; readDate: string; pagesRead: number | null }>();
  for (const row of recordRows ?? []) {
    const status = row.status as ReadingStatus;
    const prev = best.get(row.child_id);
    if (!prev || RANK[status] > RANK[prev.status]) {
      best.set(row.child_id, { status, readDate: row.read_date, pagesRead: row.pages_read });
    }
  }
  const doneCount = children.filter((c) => best.get(c.id)?.status === "done").length;
  const sorted = [...children].sort(
    (a, b) => (RANK[best.get(b.id)?.status ?? "want"] + (best.has(b.id) ? 1 : 0)) - (RANK[best.get(a.id)?.status ?? "want"] + (best.has(a.id) ? 1 : 0))
  );

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href={`/teacher/books?group=${groupId}`} className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 추천도서
      </Link>

      <div className="mt-3 flex items-center gap-3">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt="" className="h-20 w-14 flex-none rounded-md object-cover" />
        ) : (
          <div className="h-20 w-14 flex-none rounded-md" style={{ background: "var(--card)" }} />
        )}
        <div className="min-w-0">
          <h1 className="d text-lg leading-snug">{book.title}</h1>
          {book.author && (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              {book.author}
            </p>
          )}
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            {group.name} · {doneCount}/{children.length}명 읽음
          </p>
        </div>
      </div>

      {(assignmentRows ?? []).length > 0 && (
        <p className="mt-3 text-xs" style={{ color: "var(--lantern)" }}>
          이 책이 들어간 숙제: {(assignmentRows ?? []).map((a) => a.title).join(", ")}
        </p>
      )}

      <div className="mt-6">
        <p className="d text-base">아이들</p>
        {sorted.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 승인된 아이가 없어요.
          </p>
        ) : (
          <div
            className="mt-3 overflow-hidden rounded-[var(--r)] border"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            {sorted.map((child, index) => {
              const r = best.get(child.id);
              return (
                <Link
                  key={child.id}
                  href={`/teacher/children/${child.id}?group=${groupId}`}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                >
                  <div
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    style={{ background: "var(--paper)" }}
                  >
                    <AvatarIllustration avatar={child.avatar} height={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{child.name}</p>
                    {r && (
                      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                        {r.readDate}
                        {r.status === "reading" && r.pagesRead ? ` · ${r.pagesRead}쪽까지` : ""}
                      </p>
                    )}
                  </div>
                  {r?.status === "done" ? (
                    <span className="d flex flex-none items-center gap-1 text-xs" style={{ color: "var(--point-deep)" }}>
                      <PawStamp avatar={child.avatar} height={20} />
                      읽었어요
                    </span>
                  ) : (
                    <span className="flex-none text-xs" style={{ color: r ? "var(--lantern)" : "var(--ink-2)" }}>
                      {r ? LABEL[r.status] : "아직"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
