import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getActiveProfile } from "@/lib/active-profile";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import BrowseGroups from "@/components/browse-groups";
import JoinByCode from "@/components/join-by-code";
import GroupRemoveButton from "@/components/group-remove-button";

type GroupRow = { id: string; name: string; type: string; join_policy: string; owner_id?: string };

export default async function RecommendPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-6 pt-8">
        <h1 className="d text-xl">추천</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 서로 무관한 조회 셋(활성 아이, 내가 운영진인 그룹, 공개 그룹 목록)을
  // 동시에 왕복한다.
  const [activeChild, activeProfile, { data: operatorRows }, { data: openGroupRows }] = await Promise.all([
    getActiveChild(supabase, userId),
    getActiveProfile(supabase, userId),
    supabase
      .from("group_members")
      .select("groups(id, name, type, join_policy, owner_id)")
      .eq("user_id", userId)
      .eq("status", "approved"),
    supabase.from("groups").select("id, name, type").eq("join_policy", "open"),
  ]);

  const { data: memberRows } = activeChild
    ? await supabase
        .from("group_members")
        .select("groups(id, name, type, join_policy)")
        .eq("child_id", activeChild.id)
        .eq("status", "approved")
    : { data: null };

  const operatorGroups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const memberGroups = (memberRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));

  // 숲지기 프로필이면 운영하는 그룹, 아이 프로필이면 아이가 속한 그룹만
  // "내 그룹"이다 -- 같은 계정이 둘 다여도 지금 보고 있는 프로필 기준.
  const myGroups = (activeProfile.type === "operator" ? operatorGroups : memberGroups).filter(
    (g, i, arr) => arr.findIndex((other) => other.id === g.id) === i
  );
  const myGroupIds = myGroups.map((g) => g.id);
  // 둘러보기에는 아직 안 따라가는 그룹만 -- 내 그룹에 있는 게 아래에 또
  // 뜨면 같은 그룹이 두 번 보인다. 끊기는 그룹 상세의 "팔로잉"에서.
  const browseGroups = (openGroupRows ?? []).filter((g) => !myGroupIds.includes(g.id));

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
      {/* 그룹을 "만드는" 건 숲지기의 일이다. 아이 프로필로 볼 때는 여기서
          그룹을 만들 수 없고(찾기·참가만), 숲지기가 되려면 더보기 → 숲지기
          프로필에서 시작한다 -- 아이 화면과 숲지기 화면에 같은 버튼이 있어
          "누가 그룹을 만드는 건지" 헷갈리던 걸 정리. */}
      {activeProfile.type === "operator" && (
        <div className="flex justify-end">
          <Link
            href="/recommend/create"
            className="d rounded-[14px] px-4 py-2 text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            + 그룹 만들기
          </Link>
        </div>
      )}

      <div className={activeProfile.type === "operator" ? "mt-6" : ""}>
        <p className="d text-base">내 그룹</p>
        {myGroups.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 속한 그룹이 없어요. 아래에서 둘러보거나 초대 코드로 참가해 보세요.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {myGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 rounded-[var(--r)] border p-4"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                <Link href={`/recommend/${group.id}`} className="min-w-0 flex-1">
                  <p className="d truncate text-sm">{group.name}</p>
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {GROUP_TYPE_LABELS[group.type] ?? group.type}
                  </p>
                </Link>
                {/* 그룹 빼기: 아이는 나가기(팔로우 끊기·탈퇴), 그룹장은 삭제,
                    그룹장이 아닌 운영진은 운영 그만두기. */}
                {activeProfile.type === "operator" ? (
                  <GroupRemoveButton
                    groupId={group.id}
                    groupName={group.name}
                    mode={group.owner_id === userId ? { kind: "delete" } : { kind: "leave-operator", userId }}
                  />
                ) : (
                  activeChild && (
                    <GroupRemoveButton
                      groupId={group.id}
                      groupName={group.name}
                      mode={{ kind: "leave-child", childId: activeChild.id }}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeChild && (
        <div className="mt-8">
          <JoinByCode activeChildId={activeChild.id} />
        </div>
      )}

      <div className="mt-8">
        <p className="d text-base">둘러보기</p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          공개된 기관·크리에이터 추천도서 리스트예요. 이름을 누르면 소개와 추천도서를 먼저 둘러볼 수 있어요.
        </p>
        <div className="mt-3">
          <BrowseGroups groups={browseGroups} followingIds={[]} activeChildId={activeChild?.id ?? null} />
        </div>
      </div>
    </div>
  );
}
