import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { shortMd } from "@/components/log-row";
import ManagedLogList, { type ManagedRow } from "@/components/managed-log-list";
import { effectiveRange } from "@/lib/assignment-period";
import { missionChip } from "@/lib/assignment-chip";
import { operatorGroupsQuery } from "@/lib/operator-groups";

type AssignmentCard = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description: string | null;
  bookTitles: string[];
  missions: { type: string }[];
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  completed: number;
  total: number;
};

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숙제</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // "교사 계정"이라는 고정된 역할 대신, 실제로 운영진으로 승인된 그룹이
  // 있는지로 판단한다(계정 하나가 아이 프로필과 선생님 프로필을 동시에
  // 가질 수 있음). 그룹이 하나도 없으면 아래 "아직 만든 숙제가 없어요"
  // 안내가 그대로 자연스럽게 뜬다.
  // 운영 그룹 + 숙제(책 제목·미션)를 임베드 한 번으로, 완료 현황은 나란히.
  type AssignmentRow = {
    id: string;
    title: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    assignment_books: { books: { title: string } | null }[] | null;
    assignment_missions: { type: string }[] | null;
  };
  type GroupRow = { id: string; name: string; assignments: AssignmentRow[] | null };
  const [{ data: groupRows }, { data: completionRows }] = await Promise.all([
    operatorGroupsQuery(
      supabase,
      userId,
      "assignments(id, title, description, start_date, end_date, created_at, assignment_books(books(title)), assignment_missions(type))"
    ).overrideTypes<GroupRow[], { merge: false }>(),
    // security_invoker 뷰라 RLS상 내가 볼 수 있는 숙제 행만 온다.
    supabase.from("assignment_completion").select("assignment_id, child_id, completed"),
  ]);
  const groups = groupRows ?? [];

  // completion 뷰는 (숙제, 책, 아이) 단위라, "아이가 그 숙제의 책을 전부
  // 읽었는지"로 다시 묶어서 "N/M명 완료"로 보여준다.
  const completionByAssignment = new Map<string, { completed: number; total: number }>();
  {
    const perChild = new Map<string, Map<string, boolean>>();
    for (const row of completionRows ?? []) {
      const m = perChild.get(row.assignment_id) ?? new Map<string, boolean>();
      m.set(row.child_id, (m.get(row.child_id) ?? true) && row.completed);
      perChild.set(row.assignment_id, m);
    }
    for (const [assignmentId, m] of perChild) {
      completionByAssignment.set(assignmentId, {
        completed: Array.from(m.values()).filter(Boolean).length,
        total: m.size,
      });
    }
  }

  const cards: AssignmentCard[] = groups
    .flatMap((group) => (group.assignments ?? []).map((assignment) => ({ group, assignment })))
    // 최근에 낸 숙제가 위.
    .sort((a, b) => b.assignment.created_at.localeCompare(a.assignment.created_at))
    .map(({ group, assignment }) => {
    const stat = completionByAssignment.get(assignment.id) ?? { completed: 0, total: 0 };
    return {
      id: assignment.id,
      groupId: group.id,
      groupName: group.name,
      title: assignment.title,
      description: assignment.description,
      bookTitles: (assignment.assignment_books ?? [])
        .map((ab) => ab.books?.title)
        .filter((t): t is string => Boolean(t)),
      missions: assignment.assignment_missions ?? [],
      startDate: assignment.start_date,
      endDate: assignment.end_date,
      createdAt: assignment.created_at,
      completed: stat.completed,
      total: stat.total,
    };
  });

  // "몇 개인지, 언제까지인지"가 한눈에 보여야 한다는 요청 -- 그룹별이
  // 아니라 아이 쪽 숙제 탭(assignment-today.tsx)과 같은 기준인 마감일로
  // 묶는다. 한 마감일에 여러 그룹의 숙제가 걸릴 수 있어 headingSub에
  // 그 그룹 이름들을 적어 어디 숙제인지는 계속 보이게 한다.
  type DueSection = { due: string; groupNames: string[]; cards: AssignmentCard[] };
  const sections: DueSection[] = [];
  for (const card of cards) {
    const due = effectiveRange(card).end;
    const section = sections.find((s) => s.due === due);
    if (section) {
      section.cards.push(card);
      if (!section.groupNames.includes(card.groupName)) section.groupNames.push(card.groupName);
    } else {
      sections.push({ due, groupNames: [card.groupName], cards: [card] });
    }
  }
  sections.sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      {/* 제목·버튼을 한 줄에, 설명글은 그 아래 전체 너비로 -- 추천도서 탭과
          같은 이유("설명글 배치 좀 가로 맞춰서" 피드백)로 통일한다. */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="d text-xl">숙제</h1>
        {groups.length > 0 && (
          <Link
            href="/teacher/assignments/new"
            className="d flex-none rounded-[14px] px-3 py-2 text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            + 숙제 만들기
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        추천도서 서랍에서 골라 기간을 정해 낸 숙제예요. 오른쪽은 몇 명이 끝냈는지, 누르면 아이별로 자세히
        보여요.
      </p>

      {groups.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.
        </p>
      ) : sections.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 낸 숙제가 없어요.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {sections.map((section) => {
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
                headingSub={`${section.groupNames.join(" · ")} · 숙제 ${section.cards.length}개`}
                addHref="/teacher/assignments/new"
                addLabel="+ 숙제"
                rows={rows}
                emptyText="아직 낸 숙제가 없어요."
                table="assignments"
                deleteNoun="지울까요? (아이들의 독서기록은 남아요)"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
