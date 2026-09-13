import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getRecommendBooks } from "@/lib/recommend-books";
import CreateAssignment from "@/components/create-assignment";
import OperatorGroupMultiPicker from "@/components/operator-group-multi-picker";
import Section from "@/components/section";

// "+ 숙제 만들기"를 눌렀을 때 곧장 숙제 폼만 보이는 화면. 예전엔 그룹
// 상세(#assignment)로 보내서 가입 승인·책 올리기 같은 관리 메뉴가 먼저
// 떴다("숙제 추가하기 눌렀으면 그게 나와야지").
export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; groups?: string }>;
}) {
  const { group: groupParam, groups: groupsParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
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

  // 여러 그룹을 한 번에 고를 수 있다(사용자 요청: "그룹 모두에 추천도서와
  // 숙제 동시에 넣을 수도 있단다") -- `?groups=id1,id2`가 있으면 그걸,
  // 아니면 예전처럼 `?group=` 하나 또는(그룹이 하나뿐이면) 자동 선택.
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

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-[20px] pb-[16px]">
      <Link
        href={selected.length === 1 ? `/teacher/assignments?group=${selected[0].id}` : "/teacher/assignments"}
        className="text-sm"
        style={{ color: "var(--ink-2)" }}
      >
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
      ) : selected.length === 0 ? (
        <Section className="mt-5" title="어느 그룹에 낼까요?" description="여러 그룹을 함께 고르면 같은 숙제를 한 번에 낼 수 있어요." flush>
          <OperatorGroupMultiPicker groups={groups} basePath="/teacher/assignments/new" verb="숙제 내기" />
        </Section>
      ) : (
        <NewAssignmentForm groups={selected} multi={groups.length > 1} />
      )}
    </div>
  );
}

async function NewAssignmentForm({ groups, multi }: { groups: { id: string; name: string }[]; multi: boolean }) {
  const supabase = await createClient();
  // 그룹을 딱 하나 골랐을 때만 "추천도서에서 고르기"를 보여준다 -- 여러
  // 그룹을 동시에 낼 땐 그룹마다 추천도서 서랍이 달라 후보를 하나로 합칠
  // 수 없다(책 찾아 넣기는 그룹과 무관해서 그대로 쓸 수 있다).
  const books =
    groups.length === 1
      ? (await getRecommendBooks(supabase, groups[0].id, null)).books.map((book) => ({
          id: book.bookId,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
        }))
      : [];
  return (
    <Section
      className="mt-5"
      title={groups.map((g) => g.name).join(" · ")}
      description={
        groups.length > 1
          ? "읽을 책을 찾아 넣고 언제까지인지 정하면, 같은 숙제가 고른 그룹마다 하나씩 생겨요."
          : "읽을 책을 찾아 넣고 언제까지인지 정해요. 추천도서에서 골라 넣을 수도 있어요."
      }
      action={
        multi ? (
          <Link href="/teacher/assignments/new" className="text-xs" style={{ color: "var(--ink-2)" }}>
            다른 그룹
          </Link>
        ) : undefined
      }
    >
      <CreateAssignment
        groupIds={groups.map((g) => g.id)}
        books={books}
        defaultOpen
        afterSaveHref={groups.length === 1 ? `/teacher/assignments?group=${groups[0].id}` : "/teacher/assignments"}
        cancelHref={groups.length === 1 ? `/teacher/assignments?group=${groups[0].id}` : "/teacher/assignments"}
      />
    </Section>
  );
}
