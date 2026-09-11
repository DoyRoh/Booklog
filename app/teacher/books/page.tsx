import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import ManagedLogList from "@/components/managed-log-list";
import { OPERATOR_GROUP_BAR_HEIGHT } from "@/lib/group-bar-height";
import { loadOperatorBookSections, operatorBookRows } from "@/lib/operator-books";
import { pickActiveGroupId } from "@/lib/active-operator-group";

// 숲지기의 "추천도서" 탭 -- 그룹 하나를 골라(둘 이상일 때만 우측 상단
// 드롭다운으로) 그 그룹의 추천도서 전체를 바로 관리한다(추가·선택·삭제).
// 예전엔 그룹마다 미리보기 10권 + "관리" 화면으로 한 단계 더 들어가야
// 했는데, 그룹이 하나뿐인 대다수 숲지기에게는 그 중간 화면이 그냥
// 불필요한 클릭이었다("관리를 들어가도 추가 기능이 또 있다"는 지적).
export default async function TeacherBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group: groupParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
        <h1 className="d text-xl">추천도서</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const [sections, { data: userRow }] = await Promise.all([
    loadOperatorBookSections(supabase, userId),
    supabase.from("users").select("active_operator_group_id").eq("id", userId).single(),
  ]);
  const activeGroupId = pickActiveGroupId(sections, groupParam, userRow?.active_operator_group_id);
  const selected = sections.find((s) => s.id === activeGroupId) ?? null;
  // 그룹 전환 바는 루트 레이아웃의 `OperatorGroupBar`가 그린다(페이지마다
  // 그리면 탭 이동 때 언마운트돼 깜빡였다) -- 여기선 그만큼 본문 위쪽
  // 여백만 미리 마련한다.
  const showGroupTiles = sections.length > 1 && !!selected;

  return (
    <div
      className="mx-auto max-w-[520px] px-5 pb-10"
      style={{ paddingTop: showGroupTiles ? `${20 + OPERATOR_GROUP_BAR_HEIGHT}px` : "20px" }}
    >
      <h1 className="d text-xl">추천도서</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        그룹마다 책 서랍이 하나씩 있어요. 오른쪽 ‘선택’으로 여러 권을 한 번에 뺄 수 있어요.
      </p>

      {!selected ? (
        <div className="mt-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 운영하는 그룹이 없어요.
          </p>
          <Link href="/recommend/create" className="d mt-2 inline-block text-sm" style={{ color: "var(--point)" }}>
            + 그룹 만들기
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <ManagedLogList
              heading="추천도서"
              headingSub={`${selected.books.length}권`}
              addHref={`/teacher/books/add?group=${selected.id}`}
              addLabel="+ 책 추가"
              rows={operatorBookRows(selected)}
              emptyText="아직 추천도서가 없어요. ‘+ 책 추가’로 올려 주세요."
              table="book_list_items"
              deleteNoun="추천도서에서 뺄까요? (아이들의 기록은 남아요)"
            />
          </div>
          {sections.length > 1 && (
            <Link
              href="/teacher/books/add"
              className="d mt-3 inline-block text-xs"
              style={{ color: "var(--ink-2)" }}
            >
              여러 그룹에 함께 올리려면 ›
            </Link>
          )}
        </>
      )}
    </div>
  );
}
