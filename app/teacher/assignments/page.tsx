import Link from "next/link";
import PrintExportLink from "@/components/print-export-link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import AssignmentTable from "@/components/assignment-table";
import { OPERATOR_GROUP_BAR_HEIGHT } from "@/lib/group-bar-height";
import { pickActiveGroupId } from "@/lib/active-operator-group";
import { loadOperatorAssignmentSections } from "@/lib/operator-assignments";

// 숲지기의 "숙제" 탭 -- 그룹 하나를 골라(상단 고정 그룹 바에서, 그룹이 하나여도 뜸 --
// 드롭다운으로) 그 그룹의 숙제만 마감일순으로 본다. 예전엔 모든 그룹의
// 숙제를 마감일로 한데 묶어 보여줘서 헤딩마다 그룹 이름을 나열해야 했는데,
// 그룹을 먼저 고르는 구조로 바뀌면서 그 나열이 필요 없어졌다.
export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group: groupParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px]">
        <h1 className="d text-xl">숙제</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const [sections, { data: userRow }] = await Promise.all([
    loadOperatorAssignmentSections(supabase, userId),
    supabase.from("users").select("active_operator_group_id").eq("id", userId).single(),
  ]);

  const activeGroupId = pickActiveGroupId(sections, groupParam, userRow?.active_operator_group_id);
  const selected = sections.find((s) => s.id === activeGroupId) ?? null;

  // 그룹 전환 바는 루트 레이아웃의 `OperatorGroupBar`가 그린다 -- 여기선
  // 그만큼 본문 위쪽 여백만 미리 마련한다.
  const showGroupTiles = sections.length > 0 && !!selected;

  return (
    <div
      className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pb-10"
      style={{ paddingTop: showGroupTiles ? `${20 + OPERATOR_GROUP_BAR_HEIGHT}px` : "20px" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="d text-xl">숙제</h1>
        {selected && selected.cards.length > 0 && (
          <PrintExportLink href={`/teacher/export?group=${selected.id}&type=assignments`} />
        )}
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        추천도서 서랍에서 골라 기간을 정해 낸 숙제예요. 엑셀처럼 제목·마감일을 칸에서 바로 고치고,
        여러 개를 골라 마감일을 한 번에 바꾸거나 지울 수 있어요.
      </p>

      {selected && selected.cards.length > 0 && (
        <div className="mt-[12px] flex items-center gap-2">
          <span className="d flex-none text-sm" style={{ color: "var(--ink-2)" }}>
            숙제 {selected.cards.length}개
          </span>
          <div className="h-px min-w-[4px] flex-1" style={{ background: "rgba(38,54,43,0.08)" }} />
        </div>
      )}

      {!selected ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.
        </p>
      ) : selected.cards.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 낸 숙제가 없어요.
          </p>
          <Link
            href={`/teacher/assignments/new?group=${selected.id}`}
            className="d mt-2 inline-block text-sm"
            style={{ color: "var(--point)" }}
          >
            + 숙제 만들기
          </Link>
        </div>
      ) : (
        <>
          <AssignmentTable groupId={selected.id} rows={selected.cards} />
          {sections.length > 1 && (
            <Link
              href="/teacher/assignments/new"
              className="d mt-3 inline-block text-xs"
              style={{ color: "var(--ink-2)" }}
            >
              여러 그룹에 함께 내려면 ›
            </Link>
          )}
        </>
      )}
    </div>
  );
}
