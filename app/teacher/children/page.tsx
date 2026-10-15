import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { AvatarIllustration } from "@/components/illustration";
import { OPERATOR_GROUP_BAR_HEIGHT } from "@/lib/group-bar-height";
import { operatorGroupsQuery } from "@/lib/operator-groups";
import { pickActiveGroupId } from "@/lib/active-operator-group";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import GroupApprovals from "@/components/group-approvals";
import Section from "@/components/section";
import InviteCodeCopy from "@/components/invite-code-copy";

type AvatarKind = "rabbit" | "dog" | "cat" | null;

type ChildCard = {
  id: string;
  name: string;
  avatar: AvatarKind;
  readCount: number;
  listCount: number;
  completed: number;
  total: number;
};

type GroupSection = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  joinPolicy: string;
  inviteCode: string | null;
  children: ChildCard[];
  pending: { id: string; childName: string }[];
};

// 숲지기의 "아이들" 탭 -- 두 단계(사용자 요청: "처음 들어가면 그룹명이랑
// 몇 명인지, 간략 소개글이 나오고, 누르면 아이들 목록과 관리로").
//  1) ?group= 없음: 운영하는 그룹 카드 목록(이름·유형·아이 수·승인 대기·소개).
//  2) ?group=<id>: 그 그룹의 소개 + 초대 코드 + 가입 승인 대기 + 아이 목록.
// 그룹을 여러 개 운영하는 게 기본 체계라, 먼저 그룹을 고르게 했다.
export default async function TeacherChildrenPage({
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
        <h1 className="d text-xl">그룹</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 운영 그룹 + 그룹원(승인·대기 모두) + 숙제 + 추천도서 + 우리 그룹에서 남긴
  // 완독 기록을 임베드 한 번으로, 완료 현황은 나란히.
  type ChildRow = { id: string; name: string; avatar: AvatarKind };
  type GroupRow = {
    id: string;
    name: string;
    type: string;
    description: string | null;
    join_policy: string;
    invite_code: string | null;
    members: { id: string; child_id: string | null; status: string; children: ChildRow | null }[] | null;
    assignments: { id: string }[] | null;
    book_lists: { book_list_items: { book_id: string }[] | null }[] | null;
    reading_records: { child_id: string; book_id: string }[] | null;
  };
  const [{ data: groupRows }, { data: completionRows }, { data: userRow }] = await Promise.all([
    operatorGroupsQuery(
      supabase,
      userId,
      "description, join_policy, invite_code, members:group_members(id, child_id, status, children(id, name, avatar)), assignments(id), book_lists(book_list_items(book_id)), reading_records(child_id, book_id)"
    )
      // 숲지기는 자기 그룹으로 기록된 독서기록만 볼 수 있다(RLS) -- 그래서
      // "우리 그룹의 추천도서를 우리 그룹에서 읽은 것" 기준으로 센다.
      .eq("reading_records.status", "done")
      .overrideTypes<GroupRow[], { merge: false }>(),
    // security_invoker 뷰라 RLS상 내가 볼 수 있는 숙제 행만 온다.
    supabase.from("assignment_completion").select("assignment_id, child_id, completed"),
    supabase.from("users").select("active_operator_group_id").eq("id", userId).single(),
  ]);
  const groups = groupRows ?? [];

  const sections: GroupSection[] = groups.map((group) => {
    const childMembers = (group.members ?? []).filter((row) => row.child_id && row.children);
    const children = childMembers.filter((row) => row.status === "approved").map((row) => row.children!);
    const pending = childMembers
      .filter((row) => row.status === "pending")
      .map((row) => ({ id: row.id, childName: row.children!.name }));
    const listBooks = new Set((group.book_lists ?? []).flatMap((l) => (l.book_list_items ?? []).map((i) => i.book_id)));
    const assignmentIds = new Set((group.assignments ?? []).map((a) => a.id));
    // 아이 → 읽은 추천도서 id 집합
    const readByChild = new Map<string, Set<string>>();
    for (const row of group.reading_records ?? []) {
      if (!listBooks.has(row.book_id)) continue;
      const set = readByChild.get(row.child_id) ?? new Set<string>();
      set.add(row.book_id);
      readByChild.set(row.child_id, set);
    }

    return {
      id: group.id,
      name: group.name,
      type: group.type,
      description: group.description,
      joinPolicy: group.join_policy,
      inviteCode: group.invite_code,
      pending,
      children: children.map((child) => {
        const byAssignment = new Map<string, boolean>();
        for (const row of completionRows ?? []) {
          if (row.child_id !== child.id || !assignmentIds.has(row.assignment_id)) continue;
          byAssignment.set(row.assignment_id, (byAssignment.get(row.assignment_id) ?? true) && row.completed);
        }
        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          readCount: readByChild.get(child.id)?.size ?? 0,
          listCount: listBooks.size,
          completed: Array.from(byAssignment.values()).filter(Boolean).length,
          total: byAssignment.size,
        };
      }),
    };
  });

  // 추천도서·숙제 탭과 같은 규칙으로 그룹 하나를 고른다(URL > 저장된 값 > 첫 그룹).
  // 그룹 전환은 상단 고정 바(`OperatorGroupBar`)에서.
  const selectedId = pickActiveGroupId(sections, groupParam, userRow?.active_operator_group_id);
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  if (!selected) {
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px] pb-[16px]">
        <h1 className="d text-xl">그룹</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.
        </p>
        <Link
          href="/recommend/create"
          className="d mt-4 inline-block rounded-full px-4 py-2 text-sm text-white"
          style={{ background: "var(--point-deep)" }}
        >
          + 새 그룹 만들기
        </Link>
      </div>
    );
  }

  // ── 고른 그룹 하나의 아이들과 관리 ──────────────────────────────
  // 그룹이 하나라도 있으면 상단바 아래 고정 그룹 전환 바(`OperatorGroupBar`,
  // 루트 레이아웃)가 뜬다 -- 그만큼 본문 위쪽 여백을 미리 마련한다.
  const showGroupTiles = sections.length > 0;

  return (
    <div
      className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pb-[16px]"
      style={{ paddingTop: showGroupTiles ? `${20 + OPERATOR_GROUP_BAR_HEIGHT}px` : "20px" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="d text-xl">{selected.name}</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
            {GROUP_TYPE_LABELS[selected.type] ?? selected.type} ·{" "}
            {selected.joinPolicy === "open" ? "공개" : "승인제"} · 아이 {selected.children.length}명
          </p>
          {/* 공개·승인제 모두 초대 코드가 있다 -- 코드로 들어오면 공개 그룹은 바로 팔로우, 승인제는 가입 신청. */}
          {selected.inviteCode && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                초대 코드
              </span>
              <InviteCodeCopy code={selected.inviteCode} />
            </div>
          )}
        </div>
        <Link href={`/recommend/${selected.id}`} className="d flex-none pt-1 text-xs" style={{ color: "var(--point)" }}>
          그룹 설정 ›
        </Link>
      </div>
      {selected.description && (
        <p className="mt-3 whitespace-pre-line text-sm" style={{ color: "var(--ink)" }}>
          {selected.description}
        </p>
      )}

      {selected.pending.length > 0 && (
        <Section className="mt-5" title="가입 승인 대기" description={`${selected.pending.length}명이 기다리고 있어요`}>
          <GroupApprovals pending={selected.pending} />
        </Section>
      )}

      <Section
        className="mt-5"
        title="아이들"
        description="누르면 책별·숙제별로 자세히 보여요."
        action={
          <span className="d text-sm" style={{ color: "var(--ink-2)" }}>
            {selected.children.length}명
          </span>
        }
        flush
      >
        {selected.children.length === 0 ? (
          <p className="px-[24px] py-4 text-sm" style={{ color: "var(--ink-2)" }}>
            {selected.inviteCode
              ? `아직 ${selected.joinPolicy === "open" ? "따르는" : "승인된"} 아이가 없어요. 초대 코드 ${selected.inviteCode}를 알려 주세요.`
              : "아직 이 그룹을 따르는 아이가 없어요."}
          </p>
        ) : (
          selected.children.map((child, index) => (
            <Link
              key={child.id}
              href={`/teacher/children/${child.id}?group=${selected.id}`}
              className="flex items-center gap-3 px-[24px] py-3"
              style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
            >
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: "var(--paper)" }}>
                <AvatarIllustration avatar={child.avatar} height={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{child.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
                  추천도서 {child.readCount}/{child.listCount}권 읽음 ·{" "}
                  {child.total > 0 ? `숙제 ${child.completed}/${child.total} 완료` : "숙제 없음"}
                </p>
              </div>
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                ›
              </span>
            </Link>
          ))
        )}
      </Section>
    </div>
  );
}
