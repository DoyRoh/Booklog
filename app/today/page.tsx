import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getTodayAssignments } from "@/lib/assignments";
import AssignmentSummary from "@/components/assignment-summary";
import RecentRecords, { type RecentRecord } from "@/components/recent-records";

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

  // role과 활성 아이는 둘 다 userId에만 의존하고 서로 무관하므로 동시에
  // 물어본다(role이 parent가 아니면 activeChild 조회는 버려지지만, 흔한
  // 부모 계정 쪽에서 왕복 하나를 아끼는 게 더 이득이다).
  const [{ data: profile }, activeChild] = await Promise.all([
    supabase.from("users").select("role").eq("id", userId).single(),
    getActiveChild(supabase, userId),
  ]);

  if (profile?.role !== "parent") {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">오늘</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          {profile?.role === "teacher"
            ? "교사 대시보드에서 반의 숙제 진행 상황을 볼 수 있어요."
            : "큐레이터 대시보드에서 발행한 리스트를 관리할 수 있어요."}
        </p>
        <Link
          href={profile?.role === "teacher" ? "/teacher" : "/curator"}
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
  const [{ data: allRecords }, assignments, { data: groupRows }] = await Promise.all([
    supabase
      .from("reading_records")
      .select(
        "id, status, rating, emotion, favorite, parent_memo, read_date, pages_read, photo_url, voice_url, books(title, author, cover_url)"
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

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = doneRecords.filter((r) => r.read_date === todayKey).length;

  // 이번 주 시작(월요일)은 lib/badges.ts의 "이번 주" 배지와 같은 공식을
  // 쓴다 -- 두 곳 다 짧은 계산이라 별도 유틸로 뽑지 않고 그대로 둔다.
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - ((weekStartDate.getDay() + 6) % 7));
  const weekKey = weekStartDate.toISOString().slice(0, 10);
  const weekCount = doneRecords.filter((r) => r.read_date >= weekKey).length;

  const thisMonthKey = new Date().toISOString().slice(0, 7);
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
      photoPath: r.photo_url,
      voicePath: r.voice_url,
    };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <p className="hand text-xl" style={{ color: "var(--point-deep)" }}>
        {activeChild.name}, 오늘도 책숲을 걸어볼까요?
      </p>

      {/* 오늘 탭이 가장 먼저 보여줘야 하는 건 "지금까지 얼마나 읽었는지"
          요약이라, 요약 박스를 맨 위로 올리고 기록 버튼은 그 아래로
          내렸다(레거시 "유안이 독서 기록" 화면 구조 참고). */}
      <div
        className="mt-3 rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
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
          className="mt-4 grid grid-cols-4 gap-1"
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
          <Link href="/assignments" className="flex flex-col items-start gap-0.5">
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
              <Link href="/records" className="text-xs" style={{ color: "var(--ink-2)" }}>
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
