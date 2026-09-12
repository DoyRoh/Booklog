import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { shortMd } from "@/components/log-row";
import ManagedLogList, { type ManagedRow } from "@/components/managed-log-list";
import { OPERATOR_GROUP_BAR_HEIGHT } from "@/lib/group-bar-height";
import { effectiveRange } from "@/lib/assignment-period";
import { missionChip } from "@/lib/assignment-chip";
import { pickActiveGroupId } from "@/lib/active-operator-group";
import {
  loadOperatorAssignmentSections,
  type OperatorAssignmentCard as AssignmentCard,
} from "@/lib/operator-assignments";

// 숲지기의 "숙제" 탭 -- 그룹 하나를 골라(둘 이상일 때만 우측 상단
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
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
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

  // "몇 개인지, 언제까지인지"가 한눈에 보여야 한다는 요청 -- 그룹을 먼저
  // 골랐으니 이제 마감일로만 묶으면 된다(아이 쪽 숙제 탭과 같은 기준).
  type DueSection = { due: string; cards: AssignmentCard[] };
  const dueSections: DueSection[] = [];
  for (const card of selected?.cards ?? []) {
    const due = effectiveRange(card).end;
    const section = dueSections.find((s) => s.due === due);
    if (section) section.cards.push(card);
    else dueSections.push({ due, cards: [card] });
  }
  dueSections.sort((a, b) => a.due.localeCompare(b.due));
  // 그룹 전환 바는 루트 레이아웃의 `OperatorGroupBar`가 그린다 -- 여기선
  // 그만큼 본문 위쪽 여백만 미리 마련한다.
  const showGroupTiles = sections.length > 1 && !!selected;

  return (
    <div
      className="mx-auto max-w-[520px] px-5 pb-10"
      style={{ paddingTop: showGroupTiles ? `${20 + OPERATOR_GROUP_BAR_HEIGHT}px` : "20px" }}
    >
      <h1 className="d text-xl">숙제</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        추천도서 서랍에서 골라 기간을 정해 낸 숙제예요. 오른쪽은 몇 명이 끝냈는지, 누르면 아이별로 자세히
        보여요.
      </p>

      {selected && selected.cards.length > 0 && (
        <div className="mt-[12px] flex items-center gap-2">
          <span className="d flex-none text-sm" style={{ color: "var(--ink-2)" }}>
            숙제 {selected.cards.length}개
          </span>
          <div className="h-px min-w-[4px] flex-1" style={{ background: "rgba(38,54,43,0.08)" }} />
          <Link
            href={`/teacher/export?group=${selected.id}&type=assignments`}
            className="d flex-none rounded-full border px-3 py-1 text-[12px]"
            style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
          >
            내보내기
          </Link>
        </div>
      )}

      {!selected ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.
        </p>
      ) : dueSections.length === 0 ? (
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
          <div className="mt-6 flex flex-col gap-4">
            {dueSections.map((section) => {
              const rows: ManagedRow[] = section.cards.map((card) => {
                const allDone = card.total > 0 && card.completed === card.total;
                return {
                  id: card.id,
                  href: `/teacher/assignments/${card.id}`,
                  dateTop: shortMd(effectiveRange(card).start),
                  chip: missionChip(card.missions),
                  title: card.title,
                  titleBold: true,
                  subtitle: card.bookTitles.length ? card.bookTitles.join(" · ") : card.description ?? undefined,
                  right: `${card.completed}/${card.total}명 완료`,
                  rightTone: allDone ? "good" : "muted",
                };
              });
              return (
                <ManagedLogList
                  key={section.due}
                  heading={`${shortMd(section.due)}까지`}
                  headingSub={`숙제 ${section.cards.length}개`}
                  addHref={`/teacher/assignments/new?group=${selected.id}`}
                  addLabel="+ 숙제"
                  rows={rows}
                  emptyText="아직 낸 숙제가 없어요."
                  table="assignments"
                  deleteNoun="지울까요? (아이들의 독서기록은 남아요)"
                />
              );
            })}
          </div>
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
