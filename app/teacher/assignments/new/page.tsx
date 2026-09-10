import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getRecommendBooks } from "@/lib/recommend-books";
import CreateAssignment from "@/components/create-assignment";
import OperatorGroupPicker from "@/components/operator-group-picker";
import Section from "@/components/section";

// "+ 숙제 만들기"를 눌렀을 때 곧장 숙제 폼만 보이는 화면. 예전엔 그룹
// 상세(#assignment)로 보내서 가입 승인·책 올리기 같은 관리 메뉴가 먼저
// 떴다("숙제 추가하기 눌렀으면 그게 나와야지").
export default async function NewAssignmentPage({
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

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
      <Link href="/teacher/assignments" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 숙제
      </Link>
      <h1 className="d mt-2 text-xl">숙제 만들기</h1>

      {groups.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.{" "}
          <Link href="/recommend/create" style={{ color: "var(--point)" }}>
            그룹 만들기
          </Link>
        </p>
      ) : !group ? (
        <Section className="mt-5" title="어느 그룹에 낼까요?" flush>
          <OperatorGroupPicker groups={groups} basePath="/teacher/assignments/new" verb="이 그룹에 숙제 내기" />
        </Section>
      ) : (
        <NewAssignmentForm groupId={group.id} groupName={group.name} multi={groups.length > 1} />
      )}
    </div>
  );
}

async function NewAssignmentForm({ groupId, groupName, multi }: { groupId: string; groupName: string; multi: boolean }) {
  const supabase = await createClient();
  const { books } = await getRecommendBooks(supabase, groupId, null);
  return (
    <Section
      className="mt-5"
      title={groupName}
      description="추천도서 중에서 골라 기간과 미션을 붙여요."
      action={
        multi ? (
          <Link href="/teacher/assignments/new" className="text-xs" style={{ color: "var(--ink-2)" }}>
            다른 그룹
          </Link>
        ) : undefined
      }
    >
      {books.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          이 그룹의 추천도서가 아직 없어요. 숙제 책은 추천도서에서 고르니{" "}
          <Link href={`/teacher/books/add?group=${groupId}`} style={{ color: "var(--point)" }}>
            먼저 책을 올려 주세요
          </Link>
          .
        </p>
      ) : (
        <CreateAssignment
          groupId={groupId}
          books={books.map((book) => ({ id: book.bookId, title: book.title }))}
          defaultOpen
          afterSaveHref="/teacher/assignments"
          cancelHref="/teacher/assignments"
        />
      )}
    </Section>
  );
}
