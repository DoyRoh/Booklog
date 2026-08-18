import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveChild } from "@/lib/active-child";
import BrowseGroups from "@/components/browse-groups";
import JoinByCode from "@/components/join-by-code";

const TYPE_LABELS: Record<string, string> = {
  kindergarten: "유치원",
  school: "학교",
  library: "도서관",
  family: "가족",
  community: "커뮤니티",
  creator: "크리에이터",
};

type GroupRow = { id: string; name: string; type: string; join_policy: string };

export default async function RecommendPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">추천</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const activeChild = await getActiveChild(supabase, user.id);

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name, type, join_policy)")
    .eq("user_id", user.id)
    .eq("status", "approved");

  const { data: memberRows } = activeChild
    ? await supabase
        .from("group_members")
        .select("groups(id, name, type, join_policy)")
        .eq("child_id", activeChild.id)
        .eq("status", "approved")
    : { data: null };

  const { data: openGroupRows } = await supabase
    .from("groups")
    .select("id, name, type")
    .eq("join_policy", "open");

  const operatorGroups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const memberGroups = (memberRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));

  const myGroups = [...operatorGroups, ...memberGroups].filter(
    (g, i, arr) => arr.findIndex((other) => other.id === g.id) === i
  );
  const myGroupIds = myGroups.map((g) => g.id);

  const isOperatorRole = profile?.role === "teacher" || profile?.role === "curator";

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="d text-xl">추천</h1>
        {isOperatorRole && (
          <Link
            href="/recommend/create"
            className="d rounded-[14px] px-4 py-2 text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            + 그룹 만들기
          </Link>
        )}
      </div>

      <div className="mt-6">
        <p className="d text-lg">내 그룹</p>
        {myGroups.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 속한 그룹이 없어요. 아래에서 둘러보거나 초대 코드로 참가해 보세요.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {myGroups.map((group) => (
              <Link
                key={group.id}
                href={`/recommend/${group.id}`}
                className="block rounded-[var(--r)] border p-4"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                <p className="d text-sm">{group.name}</p>
                <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {TYPE_LABELS[group.type] ?? group.type}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {!isOperatorRole && (
        <div className="mt-8">
          <JoinByCode activeChildId={activeChild?.id ?? null} />
        </div>
      )}

      <div className="mt-8">
        <p className="d text-lg">둘러보기</p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          공개된 기관·크리에이터 추천도서 리스트예요.
        </p>
        <div className="mt-3">
          <BrowseGroups
            groups={openGroupRows ?? []}
            followingIds={myGroupIds}
            activeChildId={activeChild?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
}
