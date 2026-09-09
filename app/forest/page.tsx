import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { loadBadges } from "@/lib/badge-data";
import ForestView, { type ForestTree } from "@/components/forest-view";

// "우리 숲" -- 지금까지 다 읽은 책 전부가 나무 한 그루씩으로 서 있는 화면.
// 오늘 탭의 "이번 달 숲"(매달 새로 자람)과 달리 여기는 계속 쌓여서
// 가득 차 간다. 같은 책을 두 번 읽었으면 나무도 두 그루(오늘 탭의
// "읽은 책 N권"과 같은 기준).
export default async function ForestPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">우리 숲</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);
  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">우리 숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숲이 여기에 자라요. 더보기에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  // 나무(완독 기록)와 장식(딴 배지)은 서로 무관하니 동시에 조회한다.
  const [{ data: rows, error }, badges] = await Promise.all([
    supabase
      .from("reading_records")
      .select("id, book_id, read_date, books(title)")
      .eq("child_id", activeChild.id)
      .eq("status", "done")
      .order("read_date", { ascending: true })
      .order("created_at", { ascending: true }),
    loadBadges(supabase, activeChild.id),
  ]);

  const trees: ForestTree[] = (rows ?? []).map((r) => ({
    id: r.id,
    bookId: r.book_id,
    title: (r.books as unknown as { title: string } | null)?.title ?? "",
    readDate: r.read_date,
  }));

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/today" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 오늘
      </Link>
      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--berry)" }}>
          숲을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. ({error.message})
        </p>
      )}
      <div className="mt-3">
        <ForestView childName={activeChild.name} avatar={activeChild.avatar} trees={trees} badges={badges} />
      </div>
    </div>
  );
}
