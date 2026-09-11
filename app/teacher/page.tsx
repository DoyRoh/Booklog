import Link from "next/link";
import Illustration from "@/components/illustration";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import { operatorGroupsQuery } from "@/lib/operator-groups";
import { effectiveRange } from "@/lib/assignment-period";
import { kstDate } from "@/lib/kst";
import { shortMd } from "@/components/log-row";
import Section from "@/components/section";

// 마감 임박 숙제 시각화에 보여줄 개수 -- 전부 다 보여주면 숙제 탭과
// 다를 게 없어진다. "지금 신경 쓸 것" 몇 개만 고른다.
const URGENT_LIMIT = 5;

type GroupSummary = {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  pendingCount: number;
};

type UrgentAssignment = {
  id: string;
  groupName: string;
  title: string;
  due: string;
  completed: number;
  total: number;
  overdue: boolean;
};

function Stat({ label, value, accent, href }: { label: string; value: string; accent?: string; href?: string }) {
  const body = (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="d text-[20px] font-semibold" style={{ color: accent ?? "var(--ink)" }}>
        {value}
      </p>
      <p className="text-[12px]" style={{ color: "var(--ink-2)" }}>
        {label}
      </p>
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  );
}

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
        <h1 className="d text-xl">숲지기 대시보드</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // "교사 계정"이라는 고정된 역할 대신, 실제로 교사/운영진으로 승인된
  // 그룹이 있는지로 이 화면을 볼 수 있는지 정한다.
  // 운영 그룹 + 그룹원 + 숙제를 임베드 한 번으로, 완료 현황은 나란히.
  type GroupRow = {
    id: string;
    name: string;
    type: string;
    members: { child_id: string | null; status: string }[] | null;
    assignments: { id: string; title: string; start_date: string | null; end_date: string | null; created_at: string }[] | null;
  };
  const [{ data: groupRows }, { data: completionRows }] = await Promise.all([
    operatorGroupsQuery(
      supabase,
      userId,
      "members:group_members(child_id, status), assignments(id, title, start_date, end_date, created_at)"
    ).overrideTypes<GroupRow[], { merge: false }>(),
    // security_invoker 뷰라 RLS상 내가 볼 수 있는 숙제 행만 온다.
    supabase.from("assignment_completion").select("assignment_id, child_id, completed"),
  ]);
  const groups = groupRows ?? [];

  // (숙제, 책, 아이) 단위 행을 "아이가 그 숙제를 다 끝냈는지"로 묶어 명 단위로.
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

  // "관리하기" 버튼 하나에 그룹 내용 관리(책/숙제 추가)까지 몰려 있어
  // 헷갈린다는 지적 -- 대시보드는 그룹별 요약 카드 나열을 그만두고,
  // 여러 그룹을 가로질러 "지금 신경 쓸 것"만 모아 보여준다. 그룹
  // 자체(이름·소개·삭제)를 만지는 자리는 그룹 설정(/recommend/[id])
  // 하나로, 책·숙제 내용을 채우는 자리는 추천도서·숙제 탭 하나로 좁힌다.
  const summaries: GroupSummary[] = [];
  const allChildIds = new Set<string>();
  let totalPending = 0;
  const urgent: UrgentAssignment[] = [];
  const today = kstDate();

  for (const group of groups) {
    const members = group.members ?? [];
    const memberCount = members.filter((m) => m.status === "approved" && m.child_id).length;
    for (const m of members) {
      if (m.status === "approved" && m.child_id) allChildIds.add(m.child_id);
    }
    const pendingCount = members.filter((m) => m.status === "pending").length;
    totalPending += pendingCount;
    summaries.push({ id: group.id, name: group.name, type: group.type, memberCount, pendingCount });

    for (const a of group.assignments ?? []) {
      const range = effectiveRange({ startDate: a.start_date, endDate: a.end_date, createdAt: a.created_at });
      const stat = completionByAssignment.get(a.id) ?? { completed: 0, total: 0 };
      if (stat.total > 0 && stat.completed >= stat.total) continue; // 이미 다 끝난 숙제는 굳이 안 보여준다
      urgent.push({
        id: a.id,
        groupName: group.name,
        title: a.title,
        due: range.end,
        completed: stat.completed,
        total: stat.total,
        overdue: range.end < today,
      });
    }
  }

  urgent.sort((a, b) => a.due.localeCompare(b.due));
  const topUrgent = urgent.slice(0, URGENT_LIMIT);
  const pendingGroups = summaries.filter((g) => g.pendingCount > 0);
  // "오늘 숙제" -- 마감이 오늘이거나 이미 지났는데 아직 다 안 끝난 것(당장
  // 신경 써야 하는 것). "진행 중" 전체(topUrgent 이전의 urgent.length)보다
  // 좁혀서, 여유 있는 숙제까지 뭉뚱그려 다급해 보이지 않게 했다.
  const dueTodayCount = urgent.filter((a) => a.due <= today).length;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-[20px] pb-[16px]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: "var(--lantern)" }}>
            등불을 들고 아이들의 길을 비추는 숲지기
          </p>
          <h1 className="d mt-1 text-xl">숲지기 대시보드</h1>
        </div>
        <Illustration name="bear-lantern" height={72} className="flex-none" />
      </div>

      {summaries.length === 0 ? (
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
          {/* 한눈에 보는 숫자 -- 그룹·아이들·숙제·추천도서 탭 각각을 안
              열어봐도 전체 규모가 바로 보이게. 네 칸을 grid로 균등하게
              나눠 칸 사이 간격이 내용 길이와 무관하게 항상 같다. 숫자를
              누르면 그 숫자가 뜻하는 화면/섹션으로 바로 이동한다. */}
          <div className="mt-6 rounded-[var(--r)] border p-5" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="그룹" value={`${summaries.length}개`} href="#operating-groups" />
              <Stat label="아이*" value={`${allChildIds.size}명`} href="/teacher/children" />
              <Stat label="오늘 숙제" value={`${dueTodayCount}개`} href="/teacher/assignments" />
              <Stat
                label="승인 대기"
                value={`${totalPending}건`}
                accent={totalPending > 0 ? "var(--lantern)" : undefined}
                href={totalPending > 0 ? "#pending-approvals" : undefined}
              />
            </div>
            <p className="mt-3 text-[10px]" style={{ color: "var(--ink-2)", opacity: 0.75 }}>
              * 여러 그룹에 속해도 아이는 한 명으로 세어요
            </p>
          </div>

          {pendingGroups.length > 0 && (
            <Section
              id="pending-approvals"
              className="mt-5"
              title="승인 대기"
              description={`${totalPending}명이 기다리고 있어요`}
              flush
            >
              {pendingGroups.map((g, i) => (
                <Link
                  key={g.id}
                  href={`/recommend/${g.id}`}
                  className="flex items-center justify-between px-[24px] py-[14px] text-sm"
                  style={i > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                >
                  <span className="d">{g.name}</span>
                  <span style={{ color: "var(--lantern)" }}>{g.pendingCount}명 대기 · 확인 ›</span>
                </Link>
              ))}
            </Section>
          )}

          {/* 마감 임박 숙제 시각화 -- 전체 목록이 아니라 그룹을 가로질러
              가장 급한 것 몇 개만, 완료 인원을 막대로 보여준다. 전체
              목록·관리는 숙제 탭에서. */}
          <Section
            className="mt-5"
            title="마감 임박 숙제"
            description={topUrgent.length > 0 ? "완료한 인원만큼 막대가 채워져요" : undefined}
            action={
              <Link href="/teacher/assignments" className="text-xs" style={{ color: "var(--point)" }}>
                전체 보기 ›
              </Link>
            }
          >
            {topUrgent.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                지금 진행 중인 숙제가 없어요.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {topUrgent.map((a) => {
                  const pct = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
                  return (
                    // 숙제 탭은 이제 그룹 하나만 보여주는 화면이라(사용자
                    // 요청: 그룹까지 껴서 정신 사납다) 여기 "전체 보기"로는
                    // 이 숙제가 있는 그룹을 못 찾을 수 있다 -- 줄 자체를 그
                    // 숙제 상세로 바로 연결해 그룹을 거치지 않고 보여준다.
                    <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="block">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate">
                          <span style={{ color: "var(--ink-2)" }}>{a.groupName} · </span>
                          <span className="d" style={{ color: "var(--ink)" }}>
                            {a.title}
                          </span>
                        </span>
                        <span className="flex-none" style={{ color: "var(--ink-2)" }}>
                          {a.completed}/{a.total}명
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-2 overflow-hidden rounded-full"
                        style={{ background: "var(--rule)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: a.overdue ? "var(--berry)" : "var(--point)",
                          }}
                        />
                      </div>
                      <p
                        className="mt-1 text-[11px]"
                        style={{ color: a.overdue ? "var(--berry)" : "var(--ink-2)" }}
                      >
                        {a.overdue ? "마감이 지났어요" : `${shortMd(a.due)}까지`}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>

          {/* 그룹 자체(이름·소개·유형·삭제)를 만지는 자리는 여기 "설정"
              하나뿐 -- 책·숙제를 올리고 고치는 건 각 탭에서 한다. */}
          <Section id="operating-groups" className="mt-5" title="운영 중인 그룹" description={`${summaries.length}개`} flush>
            {summaries.map((g, i) => (
              <Link
                key={g.id}
                href={`/recommend/${g.id}`}
                className="flex items-center justify-between px-[24px] py-[14px] text-sm"
                style={i > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
              >
                <div className="min-w-0">
                  <p className="d">{g.name}</p>
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {GROUP_TYPE_LABELS[g.type] ?? g.type} · 아이 {g.memberCount}명
                  </p>
                </div>
                <span className="flex-none text-xs" style={{ color: "var(--point)" }}>
                  설정 ›
                </span>
              </Link>
            ))}
          </Section>

          <Link
            href="/recommend/create"
            className="d mt-5 flex items-center justify-center rounded-[var(--r)] border border-dashed px-4 py-3 text-sm"
            style={{ borderColor: "rgba(38,54,43,0.28)", color: "var(--ink-2)" }}
          >
            + 새 그룹 만들기 (예: 6살 추천도서)
          </Link>
        </>
      )}
    </div>
  );
}
