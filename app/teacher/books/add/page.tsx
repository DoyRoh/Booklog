import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getRecommendBooks } from "@/lib/recommend-books";
import AddBookToList from "@/components/add-book-to-list";
import OperatorGroupMultiPicker from "@/components/operator-group-multi-picker";
import Section from "@/components/section";

// "+ 책 추가"를 눌렀을 때 곧장 책 올리기 폼만 보이는 화면(숙제 만들기와 짝).
export default async function AddRecommendBookPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; groups?: string }>;
}) {
  const { group: groupParam, groups: groupsParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px]">
        <Link href="/login" className="text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin", "curator"])
    .eq("status", "approved");
  type GroupRow = { id: string; name: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));

  // 여러 그룹을 한 번에 골라 같은 책을 동시에 올릴 수 있다(사용자 요청).
  const requestedIds = groupsParam
    ? groupsParam.split(",").filter(Boolean)
    : groupParam
      ? [groupParam]
      : [];
  const selected = requestedIds.length > 0
    ? groups.filter((g) => requestedIds.includes(g.id))
    : groups.length === 1
      ? groups
      : [];

  // 그룹마다 추천도서 목록(book_list) id를 알아야 book_list_items에 넣을 수 있다.
  const selectedLists = selected.length > 0 ? await Promise.all(selected.map((g) => getRecommendBooks(supabase, g.id, null))) : [];
  const bookListIds = selectedLists.map((r) => r.bookListId).filter((id): id is string => Boolean(id));
  const totalBooks = selectedLists.length === 1 ? selectedLists[0].books.length : null;

  return (
    <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px] pb-[16px]">
      <Link
        href={selected.length === 1 ? `/teacher/books?group=${selected[0].id}` : "/teacher/books"}
        className="text-sm"
        style={{ color: "var(--ink-2)" }}
      >
        ← 추천도서
      </Link>
      <h1 className="d mt-2 text-xl">추천도서에 책 올리기</h1>

      {groups.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.{" "}
          <Link href="/recommend/create" style={{ color: "var(--point)" }}>
            그룹 만들기
          </Link>
        </p>
      ) : selected.length === 0 ? (
        <Section className="mt-5" title="어느 그룹에 올릴까요?" description="여러 그룹을 함께 고르면 같은 책을 한 번에 올릴 수 있어요." flush>
          <OperatorGroupMultiPicker groups={groups} basePath="/teacher/books/add" verb="올리기" />
        </Section>
      ) : (
        <Section
          className="mt-5"
          title={selected.map((g) => g.name).join(" · ")}
          description={
            selected.length > 1
              ? "제목을 검색하거나 바코드를 찍으면, 고른 그룹 모두의 추천도서에 함께 올라가요."
              : (
                <>
                  <span style={{ color: "var(--point-deep)" }}>지금 {totalBooks ?? 0}권</span> · 제목을 검색하거나 바코드를 찍어 바로 올려요.
                </>
              )
          }
          action={
            groups.length > 1 ? (
              <Link href="/teacher/books/add" className="text-xs" style={{ color: "var(--ink-2)" }}>
                다른 그룹
              </Link>
            ) : undefined
          }
        >
          {bookListIds.length > 0 ? (
            <AddBookToList bookListIds={bookListIds} />
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              고른 그룹의 추천도서 목록을 찾을 수 없어요.
            </p>
          )}
        </Section>
      )}

      {/* 올리면서 어디까지 올렸는지 바로 보이도록, 그룹별로 올린 책을 최근 순으로 간단히 */}
      {selected.length > 0 &&
        selected.map((g, i) => {
          const books = selectedLists[i]?.books ?? [];
          if (books.length === 0) return null;
          return (
            <Section
              key={g.id}
              className="mt-5"
              title={selected.length > 1 ? `${g.name} · 올린 책` : "올린 책"}
              description={`${books.length}권 · 최근에 올린 순`}
              flush
            >
              <ol>
                {books.map((b, idx) => (
                  <li
                    key={b.itemId}
                    className="flex items-baseline gap-3 px-[24px] py-2"
                    style={idx > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                  >
                    <span className="w-6 flex-none text-right text-xs tabular-nums" style={{ color: "var(--ink-2)" }}>
                      {books.length - idx}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {b.title}
                      {b.author && <span style={{ color: "var(--ink-2)" }}> · {b.author}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          );
        })}
    </div>
  );
}
