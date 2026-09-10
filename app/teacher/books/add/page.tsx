import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getRecommendBooks } from "@/lib/recommend-books";
import AddBookToList from "@/components/add-book-to-list";
import OperatorGroupPicker from "@/components/operator-group-picker";
import Section from "@/components/section";

// "+ 책 추가"를 눌렀을 때 곧장 책 올리기 폼만 보이는 화면(숙제 만들기와 짝).
export default async function AddRecommendBookPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group: groupParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-6 pt-8">
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

  const group = groups.find((g) => g.id === groupParam) ?? (groups.length === 1 ? groups[0] : null);
  const { bookListId, books } = group
    ? await getRecommendBooks(supabase, group.id, null)
    : { bookListId: null, books: [] };

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
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
      ) : !group ? (
        <Section className="mt-5" title="어느 그룹에 올릴까요?" flush>
          <OperatorGroupPicker groups={groups} basePath="/teacher/books/add" verb="이 그룹에 올리기" />
        </Section>
      ) : (
        <Section
          className="mt-5"
          title={group.name}
          description={`지금 ${books.length}권 · 제목을 검색하거나 바코드를 찍어 바로 올려요.`}
          action={
            groups.length > 1 ? (
              <Link href="/teacher/books/add" className="text-xs" style={{ color: "var(--ink-2)" }}>
                다른 그룹
              </Link>
            ) : undefined
          }
        >
          {bookListId ? (
            <AddBookToList bookListId={bookListId} />
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              이 그룹의 추천도서 목록을 찾을 수 없어요.
            </p>
          )}
        </Section>
      )}
    </div>
  );
}
