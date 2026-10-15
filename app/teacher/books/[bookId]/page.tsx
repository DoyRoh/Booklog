import Link from "next/link";
import BookRecommendEditor from "@/components/book-recommend-editor";
import { parseAgeBands } from "@/lib/age-bands";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import Section from "@/components/section";
import { AvatarIllustration } from "@/components/illustration";
import type { ReadingStatus } from "@/lib/reading-status";

const RANK: Record<ReadingStatus, number> = { want: 0, reading: 1, done: 2 };
const LABEL: Record<ReadingStatus, string> = { done: "읽었어요", reading: "읽는 중", want: "읽고 싶어요" };

type ListItem = { id: string; age_bands: string[] | null; note: string | null; hasItemFields: boolean };

// 이 그룹 목록의 책 한 줄. 0038(age_bands)·0039(note) 전이면 그 컬럼 없이 다시 -- 편집기는 분야만 보인다.
async function loadListItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookId: string,
  groupId: string
): Promise<ListItem | null> {
  const q = (cols: string) =>
    supabase
      .from("book_list_items")
      .select(`${cols}, book_lists!inner(group_id)`)
      .eq("book_id", bookId)
      .eq("book_lists.group_id", groupId)
      .limit(1)
      .maybeSingle();
  const full = await q("id, age_bands, note");
  if (!full.error) {
    const row = full.data as unknown as { id: string; age_bands: string[] | null; note: string | null } | null;
    return row ? { ...row, hasItemFields: true } : null;
  }
  const bare = await q("id");
  const row = bare.data as unknown as { id: string } | null;
  return row ? { id: row.id, age_bands: null, note: null, hasItemFields: false } : null;
}

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
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px]">
        <Link href={groupId ? `/teacher/books?group=${groupId}` : "/teacher/books"} className="text-sm" style={{ color: "var(--point)" }}>
          ← 추천도서
        </Link>
      </div>
    );
  }

  const [{ data: membership }, { data: group }, { data: book }, listItem] = await Promise.all([
    supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .in("role", ["teacher", "admin", "curator"])
      .maybeSingle(),
    supabase.from("groups").select("id, name, join_policy").eq("id", groupId).maybeSingle(),
    supabase.from("books").select("id, title, author, cover_url").eq("id", bookId).maybeSingle(),
    loadListItem(supabase, bookId, groupId),
  ]);

  if (!membership || !group || !book) {
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px]">
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
  const [{ data: memberRows }, { data: recordRows }, { data: assignmentRows }, { data: categoryRows }] = await Promise.all([
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
    supabase.from("book_categories").select("category").eq("book_id", bookId),
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
    <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px] pb-[16px]">
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
            {group.name}
          </p>
        </div>
      </div>

      {(assignmentRows ?? []).length > 0 && (
        <p className="mt-3 text-xs" style={{ color: "var(--lantern)" }}>
          이 책이 들어간 숙제: {(assignmentRows ?? []).map((a) => a.title).join(", ")}
        </p>
      )}

      {listItem && (
        <Section className="mt-5" title="추천 정보" description="이 그룹 아이·부모에게 보이는 연령과 분야, 설명이에요.">
          <BookRecommendEditor
            itemId={listItem.id}
            bookId={bookId}
            initialAges={parseAgeBands(listItem.age_bands)}
            initialCategories={(categoryRows ?? []).map((r) => r.category as string)}
            initialNote={listItem.note ?? ""}
            withItemFields={listItem.hasItemFields}
          />
        </Section>
      )}

      {/* 읽은 현황은 강조하지 않고 아래에 조용히(사용자 요청). */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between px-1">
          <p className="d text-sm" style={{ color: "var(--ink-2)" }}>
            {group.join_policy === "open" ? "팔로우한 아이" : "가입한 아이"}
          </p>
          {children.length > 0 && (
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              {doneCount}/{children.length}명 읽음
            </span>
          )}
        </div>
        {sorted.length === 0 ? (
          <p className="mt-2 px-1 text-xs" style={{ color: "var(--ink-2)" }}>
            {group.join_policy === "open"
              ? "아직 이 그룹을 팔로우한 아이가 없어요. 팔로우하면 누가 읽었는지 여기 보여요."
              : "아직 가입한 아이가 없어요. 가입을 승인하면 누가 읽었는지 여기 보여요."}
          </p>
        ) : (
          <div className="mt-2">
            {sorted.map((child, index) => {
              const r = best.get(child.id);
              return (
                <Link
                  key={child.id}
                  href={`/teacher/children/${child.id}?group=${groupId}`}
                  className="flex items-center gap-2.5 px-1 py-2"
                  style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                >
                  <AvatarIllustration avatar={child.avatar} height={22} />
                  <p className="min-w-0 flex-1 truncate text-sm">{child.name}</p>
                  <span className="flex-none text-xs" style={{ color: r?.status === "done" ? "var(--point-deep)" : "var(--ink-2)" }}>
                    {r ? LABEL[r.status] : "아직"}
                    {r?.status === "reading" && r.pagesRead ? ` · ${r.pagesRead}쪽` : ""}
                    {r ? ` · ${r.readDate.slice(5).replace("-", "/")}` : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
