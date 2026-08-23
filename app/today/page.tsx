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

  // 통계/최근 기록에 쓰는 reading_records 조회와 오늘의 숙제 조회는 서로
  // 무관하므로(둘 다 activeChild.id에만 의존) 동시에 왕복한다 -- 오늘
  // 탭이 유독 느렸던 가장 큰 원인이 이 둘을 순서대로 기다리던 것이었다.
  const [{ data: allRecords }, assignments] = await Promise.all([
    supabase
      .from("reading_records")
      .select(
        "id, status, rating, emotion, favorite, parent_memo, read_date, pages_read, photo_url, voice_url, books(title, author, cover_url)"
      )
      .eq("child_id", activeChild.id)
      .order("read_date", { ascending: false }),
    getTodayAssignments(supabase, activeChild.id),
  ]);

  const doneRecords = (allRecords ?? []).filter((r) => r.status === "done");
  const totalDone = doneRecords.length;
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const monthCount = doneRecords.filter((r) => r.read_date.startsWith(thisMonthKey)).length;

  const uniqDates = Array.from(new Set(doneRecords.map((r) => r.read_date))).sort();
  let run = 0;
  let bestStreak = 0;
  let prevTime: number | null = null;
  for (const d of uniqDates) {
    const t = new Date(`${d}T00:00:00`).getTime();
    run = prevTime !== null && t - prevTime === 86400000 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prevTime = t;
  }

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
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        {activeChild.name}, 오늘도 책숲을 걸어볼까요?
      </p>

      <Link
        href="/library/add"
        className="d mt-3 block rounded-[14px] py-3.5 text-center text-base text-white"
        style={{ background: "var(--berry)" }}
      >
        + 책 기록하기
      </Link>

      <div
        className="mt-4 flex items-center justify-around rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="d text-xl" style={{ color: "var(--point-deep)" }}>
            {totalDone}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            읽은 책
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="d text-xl">{monthCount}</span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            이번 달
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="d text-xl">{bestStreak}</span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            최장 연속
          </span>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="d text-lg">오늘의 숙제</p>
          {assignments.length > 0 && (
            <Link href="/assignments" className="text-xs" style={{ color: "var(--ink-2)" }}>
              전체 보기 ›
            </Link>
          )}
        </div>
        {assignments.length === 0 ? (
          <p className="mt-3 text-base" style={{ color: "var(--ink-2)" }}>
            지금 진행 중인 숙제가 없어요. 책장에서 자유롭게 책을 기록해 보세요.
          </p>
        ) : (
          <AssignmentSummary assignments={assignments} />
        )}
      </div>

      {recentRecords.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <p className="d text-lg">최근 기록</p>
            <Link href="/records" className="text-xs" style={{ color: "var(--ink-2)" }}>
              전체 보기 ›
            </Link>
          </div>
          <div className="mt-3">
            <RecentRecords childId={activeChild.id} childName={activeChild.name} records={recentRecords} />
          </div>
        </div>
      )}
    </div>
  );
}
