import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const TYPE_LABELS: Record<string, string> = {
  kindergarten: "유치원",
  school: "학교",
  library: "도서관",
  family: "가족",
  community: "커뮤니티",
  creator: "크리에이터",
};

type GroupCard = {
  id: string;
  name: string;
  type: string;
  joinPolicy: string;
  followerCount: number;
  bookCount: number;
};

export default async function CuratorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">큐레이터 대시보드</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (profile?.role !== "curator") {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">큐레이터 대시보드</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          큐레이터 계정에서만 볼 수 있는 화면이에요.
        </p>
      </div>
    );
  }

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name, type, join_policy)")
    .eq("user_id", user.id)
    .eq("role", "curator")
    .eq("status", "approved");

  type GroupRow = { id: string; name: string; type: string; join_policy: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));

  const cards: GroupCard[] = [];
  for (const group of groups) {
    const { count: followerCount } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("status", "approved")
      .not("child_id", "is", null);

    const { data: bookList } = await supabase
      .from("book_lists")
      .select("id")
      .eq("group_id", group.id)
      .limit(1)
      .maybeSingle();

    const { count: bookCount } = bookList
      ? await supabase
          .from("book_list_items")
          .select("id", { count: "exact", head: true })
          .eq("book_list_id", bookList.id)
      : { count: 0 };

    cards.push({
      id: group.id,
      name: group.name,
      type: group.type,
      joinPolicy: group.join_policy,
      followerCount: followerCount ?? 0,
      bookCount: bookCount ?? 0,
    });
  }

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
        하얀 새가 물어온 책 소식이 여기 모여요
      </p>
      <h1 className="d mt-1 text-xl">큐레이터 대시보드</h1>

      {cards.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 발행한 리스트가 없어요.
          </p>
          <Link href="/recommend/create" className="d mt-2 inline-block text-sm" style={{ color: "var(--point)" }}>
            + 리스트 만들기
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-[var(--r)] border p-4"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="d text-sm">{card.name}</p>
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {TYPE_LABELS[card.type] ?? card.type} · {card.joinPolicy === "open" ? "공개" : "승인제"}
                  </p>
                </div>
                <Link href={`/recommend/${card.id}`} className="text-xs" style={{ color: "var(--point)" }}>
                  관리하기
                </Link>
              </div>

              <div className="mt-3 flex gap-4 text-xs" style={{ color: "var(--ink-2)" }}>
                <span>팔로워 {card.followerCount}명</span>
                <span>추천도서 {card.bookCount}권</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
