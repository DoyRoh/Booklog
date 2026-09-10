import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getActiveProfile } from "@/lib/active-profile";
import { getTodayAssignments } from "@/lib/assignments";
import AssignmentSummary from "@/components/assignment-summary";
import RecentRecords, { type RecentRecord } from "@/components/recent-records";
import Section from "@/components/section";
import ForestStrip from "@/components/forest-strip";
import { MILESTONE_COUNTS } from "@/lib/badges";
import { kstDate, kstMonth, kstWeekStart } from "@/lib/kst";

export default async function TodayPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">오늘</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 지금 활성화된 프로필과 활성 아이는 둘 다 userId에만 의존하고 서로
  // 무관하므로 동시에 물어본다(아이 프로필이 아니면 activeChild 조회는
  // 버려지지만, 흔한 아이 프로필 쪽에서 왕복 하나를 아끼는 게 더 이득이다).
  const [activeProfile, activeChild] = await Promise.all([
    getActiveProfile(supabase, userId),
    getActiveChild(supabase, userId),
  ]);

  if (activeProfile.type === "operator") {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">오늘</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          숲지기 프로필로 보고 있어요. 대시보드에서 그룹 아이들의 읽기·숙제 상황을 볼 수 있어요.
        </p>
        <Link
          href="/teacher"
          className="d mt-2 inline-block text-sm"
          style={{ color: "var(--point)" }}
        >
          대시보드로 가기
        </Link>
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">오늘</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 오늘의 숙제가 여기에 표시돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  // 통계/최근 기록에 쓰는 reading_records 조회, 오늘의 숙제 조회, 속한
  // 그룹 수 조회는 서로 무관하므로(전부 activeChild.id에만 의존) 동시에
  // 왕복한다 -- 오늘 탭이 유독 느렸던 가장 큰 원인이 이런 조회들을
  // 순서대로 기다리던 것이었다.
  const [{ data: allRecords, error: recordsError }, assignments, { data: groupRows }] = await Promise.all([
    supabase
      .from("reading_records")
      .select(
        "id, status, rating, emotion, favorite, parent_memo, read_date, pages_read, photo_url, voice_url, shelf_tag_id, books(title, author, cover_url)"
      )
      .eq("child_id", activeChild.id)
      .order("read_date", { ascending: false }),
    getTodayAssignments(supabase, activeChild.id),
    supabase.from("group_members").select("groups(id)").eq("child_id", activeChild.id).eq("status", "approved"),
  ]);

  // 마감일(end_date)을 안 정한 숙제는 날짜만으로는 절대 안 없어지므로,
  // 오늘 탭 요약에서는 책을 전부 다 읽어서 완료된 숙제를 따로 걸러낸다
  // (실사용 피드백: 다 끝난 숙제가 계속 "오늘의 숙제"에 남아있던 문제).
  // 숲길 탭(/assignments)은 관리 화면이라 완료된 것도 그대로 보여준다.
  const activeAssignments = assignments.filter((a) => {
    const completedCount = a.books.filter((b) => b.completed).length;
    return a.books.length === 0 || completedCount < a.books.length;
  });

  const doneRecords = (allRecords ?? []).filter((r) => r.status === "done");
  const totalDone = doneRecords.length;

  const todayKey = kstDate();
  const todayCount = doneRecords.filter((r) => r.read_date === todayKey).length;

  // 이번 주 시작(월요일) -- 한국 시간 기준(lib/kst.ts), 배지 계산과 공유.
  const weekKey = kstWeekStart();
  const weekCount = doneRecords.filter((r) => r.read_date >= weekKey).length;

  const thisMonthKey = kstMonth();
  const monthCount = doneRecords.filter((r) => r.read_date.startsWith(thisMonthKey)).length;

  // "그룹" 칸 = 아이가 속한(승인된) 그룹 수. 숲길 탭 드롭다운과 같은 기준으로,
  // 실제로 보이는 그룹만 중복 없이 센다(같은 그룹에 행이 둘이거나 그룹이
  // 안 보이는 행은 제외).
  const groupCount = new Set(
    (groupRows ?? [])
      .map((row) => (row.groups as unknown as { id: string } | null)?.id)
      .filter((id): id is string => Boolean(id))
  ).size;

  const recentRecords: RecentRecord[] = (allRecords ?? []).slice(0, 5).map((r) => {
    const book = r.books as unknown as {
      title: string;
      author: string | null;
      cover_url: string | null;
    } | null;
    return {
      id: r.id,
      title: book?.title ?? "",
      author: book?.author ?? null,
      coverUrl: book?.cover_url ?? null,
      status: r.status,
      rating: r.rating,
      emotion: r.emotion,
      favorite: r.favorite,
      memo: r.parent_memo ?? "",
      readDate: r.read_date,
      pagesRead: r.pages_read,
      shelfTagId: r.shelf_tag_id,
      photoPath: r.photo_url,
      voicePath: r.voice_url,
    };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-[24px] pb-[40px]">
      <p className="hand text-[24px] leading-[32px]" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
        {activeChild.name}, 오늘도 책숲을 걸어볼까요?
      </p>

      {recordsError && (
        <p className="mt-4 text-sm" style={{ color: "var(--berry)" }}>
          기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. ({recordsError.message})
        </p>
      )}

      {/* 오늘 탭이 가장 먼저 보여줘야 하는 건 "지금까지 얼마나 읽었는지"
          요약이라, 요약 박스를 맨 위로 올리고 기록 버튼은 그 아래로
          내렸다(레거시 "유안이 독서 기록" 화면 구조 참고). */}
      <div
        className="mt-[28px] rounded-[var(--r)] border p-[24px]"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        {/* 우리 숲 미리보기 -- 권수 배지("숲이 자라요")를 딴 만큼 나무가 서
            있고, 누르면 전체 숲(배지 화면)으로. 배지 계산 전체를 여기서 또
            돌리지 않고 완독 수로 권수 배지만 센다(추가 조회 없음). */}
        <ForestStrip
          treeCount={MILESTONE_COUNTS.filter((c) => totalDone >= c).length}
          avatar={activeChild.avatar}
          className="mb-[20px]"
          href="/forest"
        />
        {/* 카드 제목 행: 라벨 + 큰 숫자(32px semibold). '권'은 작고 연하게. */}
        <p className="text-[14px] leading-[20px]" style={{ color: "var(--ink-2)" }}>
          읽은 책
        </p>
        <p className="d mt-[4px] text-[32px] font-semibold leading-[36px]" style={{ color: "var(--point-deep)" }}>
          {totalDone}
          <span className="ml-[4px] text-[14px] font-normal" style={{ color: "var(--ink-2)" }}>
            권
          </span>
        </p>

        <div
          className="mt-[28px] flex justify-between pt-[20px]"
          style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}
        >
          {(
            [
              { value: todayCount, label: "오늘", href: null },
              { value: weekCount, label: "이번 주", href: null },
              { value: monthCount, label: "이번 달", href: null },
              { value: groupCount, label: "그룹", href: "/trail" },
            ] as const
          ).map((stat) => {
            const inner = (
              <>
                <span className="d text-[20px] font-semibold leading-[24px]">{stat.value}</span>
                <span className="text-[13px] leading-[18px]" style={{ color: "var(--ink-2)" }}>
                  {stat.label}
                </span>
              </>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="flex flex-col items-start gap-[4px]">
                {inner}
              </Link>
            ) : (
              <div key={stat.label} className="flex flex-col items-start gap-[4px]">
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      <Link
        href="/library/add"
        className="d mt-[16px] block rounded-[14px] py-[14px] text-center text-[16px] font-semibold text-white"
        style={{ background: "var(--berry)" }}
      >
        + 책 기록하기
      </Link>

      <Section
        className="mt-[32px]"
        title="오늘의 숙제"
        flush={activeAssignments.length > 0}
        action={
          activeAssignments.length > 0 ? (
            <Link href="/assignments" className="text-xs" style={{ color: "var(--ink-2)" }}>
              전체 보기 ›
            </Link>
          ) : undefined
        }
      >
        {activeAssignments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            지금 진행 중인 숙제가 없어요. 책장에서 자유롭게 책을 기록해 보세요.
          </p>
        ) : (
          <AssignmentSummary assignments={activeAssignments} />
        )}
      </Section>

      {recentRecords.length > 0 && (
        <Section
          className="mt-[20px]"
          title="최근 기록"
          flush
          action={
            <Link href="/library?view=list" className="text-xs" style={{ color: "var(--ink-2)" }}>
              전체 보기 ›
            </Link>
          }
        >
          <RecentRecords childId={activeChild.id} childName={activeChild.name} records={recentRecords} />
        </Section>
      )}
    </div>
  );
}
