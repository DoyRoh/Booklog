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
      <div className="mx-auto max-w-[520px] px-5 pt-8">
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
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/teacher/books" className="text-sm" style={{ color: "var(--ink-2)" }}>
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
              : `지금 ${totalBooks ?? 0}권 · 제목을 검색하거나 바코드를 찍어 바로 올려요.`
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
    </div>
  );
}
