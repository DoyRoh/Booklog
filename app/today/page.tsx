import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getActiveProfile } from "@/lib/active-profile";
import { getTodayAssignments } from "@/lib/assignments";
import AssignmentSummary from "@/components/assignment-summary";
import RecentRecords, { type RecentRecord } from "@/components/recent-records";
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
    supabase.from("group_members").select("group_id").eq("child_id", activeChild.id).eq("status", "approved"),
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

  const groupCount = (groupRows ?? []).length;

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
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
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
        className="mt-3 rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        {/* 우리 숲 미리보기 -- 권수 배지("숲이 자라요")를 딴 만큼 나무가 서
            있고, 누르면 전체 숲(배지 화면)으로. 배지 계산 전체를 여기서 또
            돌리지 않고 완독 수로 권수 배지만 센다(추가 조회 없음). */}
        <ForestStrip
          treeCount={MILESTONE_COUNTS.filter((c) => totalDone >= c).length}
          avatar={activeChild.avatar}
          className="mb-4"
          href="/forest"
        />
        <span className="text-xs" style={{ color: "var(--ink-2)" }}>
          읽은 책
        </span>
        <p className="d mt-1 text-2xl" style={{ color: "var(--point-deep)" }}>
          {totalDone}
          <span className="ml-1 text-base font-normal" style={{ color: "var(--ink-2)" }}>
            권
          </span>
        </p>

        <div
          className="mt-4 flex justify-between"
          style={{ borderTop: "1px solid var(--rule)", paddingTop: "0.875rem" }}
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="d text-lg">{todayCount}</span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              오늘
            </span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="d text-lg">{weekCount}</span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              이번 주
            </span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="d text-lg">{monthCount}</span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              이번 달
            </span>
          </div>
          <Link href="/trail" className="flex flex-col items-start gap-0.5">
            <span className="d text-lg">{groupCount}</span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              그룹
            </span>
          </Link>
        </div>
      </div>

      <Link
        href="/library/add"
        className="d mt-3 block rounded-[14px] py-3.5 text-center text-base text-white"
        style={{ background: "var(--berry)" }}
      >
        + 책 기록하기
      </Link>

      <div className="mx-1 mt-8" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="d text-base">오늘의 숙제</p>
          {activeAssignments.length > 0 && (
            <Link href="/assignments" className="text-xs" style={{ color: "var(--ink-2)" }}>
              전체 보기 ›
            </Link>
          )}
        </div>
        {activeAssignments.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
            지금 진행 중인 숙제가 없어요. 책장에서 자유롭게 책을 기록해 보세요.
          </p>
        ) : (
          <AssignmentSummary assignments={activeAssignments} />
        )}
      </div>

      {recentRecords.length > 0 && (
        <>
          <div className="mx-1 mt-8" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="d text-base">최근 기록</p>
              <Link href="/library?view=list" className="text-xs" style={{ color: "var(--ink-2)" }}>
                전체 보기 ›
              </Link>
            </div>
            <div className="mt-3">
              <RecentRecords childId={activeChild.id} childName={activeChild.name} records={recentRecords} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
