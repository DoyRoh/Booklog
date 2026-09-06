import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import NlcySyncButton from "@/components/nlcy-sync-button";

const NLCY_GROUP_NAME = "국립어린이청소년도서관";

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
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">큐레이터 대시보드</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // "큐레이터 계정"이라는 고정된 역할 대신, 실제로 큐레이터로 승인된
  // 그룹이 있는지로 판단한다(계정 하나가 아이 프로필과 기관 프로필을
  // 동시에 가질 수 있음). 그룹이 하나도 없으면 아래 "아직 발행한
  // 리스트가 없어요" 안내가 그대로 자연스럽게 뜬다.
  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name, type, join_policy)")
    .eq("user_id", userId)
    .eq("role", "curator")
    .eq("status", "approved");

  type GroupRow = { id: string; name: string; type: string; join_policy: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const groupIds = groups.map((g) => g.id);

  // 그룹마다 팔로워수/추천도서수를 따로 물어보던 걸(N+1) 한 번씩만
  // 물어보고 자바스크립트에서 묶는 방식으로 바꿨다.
  const [{ data: followerRows }, { data: bookListRows }] = groupIds.length
    ? await Promise.all([
        supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", groupIds)
          .eq("status", "approved")
          .not("child_id", "is", null),
        supabase.from("book_lists").select("id, group_id").in("group_id", groupIds),
      ])
    : [{ data: [] }, { data: [] }];

  const followerCountByGroup = new Map<string, number>();
  for (const row of followerRows ?? []) {
    followerCountByGroup.set(row.group_id, (followerCountByGroup.get(row.group_id) ?? 0) + 1);
  }

  const bookListIds = (bookListRows ?? []).map((bl) => bl.id);
  const groupIdByBookList = new Map((bookListRows ?? []).map((bl) => [bl.id, bl.group_id]));
  const { data: itemRows } = bookListIds.length
    ? await supabase.from("book_list_items").select("book_list_id").in("book_list_id", bookListIds)
    : { data: [] };
  const bookCountByGroup = new Map<string, number>();
  for (const row of itemRows ?? []) {
    const groupId = groupIdByBookList.get(row.book_list_id);
    if (!groupId) continue;
    bookCountByGroup.set(groupId, (bookCountByGroup.get(groupId) ?? 0) + 1);
  }

  const cards: GroupCard[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    joinPolicy: group.join_policy,
    followerCount: followerCountByGroup.get(group.id) ?? 0,
    bookCount: bookCountByGroup.get(group.id) ?? 0,
  }));

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
                    {GROUP_TYPE_LABELS[card.type] ?? card.type} · {card.joinPolicy === "open" ? "공개" : "승인제"}
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

              {card.name === NLCY_GROUP_NAME && (
                <>
                  <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
                    국립어린이청소년도서관 사서추천도서 Open API에서 자동으로 채워지는 목록이에요.
                  </p>
                  <NlcySyncButton />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
