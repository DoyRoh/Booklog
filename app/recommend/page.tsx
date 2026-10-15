import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getProfileSnapshot } from "@/lib/profile-snapshot";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import BrowseGroups from "@/components/browse-groups";
import JoinByCode from "@/components/join-by-code";
import GroupRemoveButton from "@/components/group-remove-button";
import Section from "@/components/section";
import { loadBrowseGroups } from "@/lib/browse-groups";

type GroupRow = {
  id: string;
  name: string;
  type: string;
  join_policy: string;
  owner_id?: string;
  operator_name?: string | null;
};

export default async function RecommendPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px]">
        <h1 className="d text-xl">그룹 찾기</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 서로 무관한 조회 셋(활성 아이, 내가 운영진인 그룹, 공개 그룹 목록)을
  // 동시에 왕복한다.
  const [{ activeChild, activeProfile }, { data: operatorRows }, allBrowse] = await Promise.all([
    getProfileSnapshot(supabase, userId),
    supabase
      .from("group_members")
      .select("groups(id, name, type, join_policy, owner_id, operator_name)")
      .eq("user_id", userId)
      .eq("status", "approved"),
    loadBrowseGroups(supabase),
  ]);

  const { data: memberRows } = activeChild
    ? await supabase
        .from("group_members")
        .select("groups(id, name, type, join_policy, operator_name)")
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
  // 둘러보기는 숲지기 상자별로 그 숲지기의 공개 그룹을 전부 보여주고, 이미 따르는
  // 그룹은 체크 동그라미로 표시한다(눌러서 끊기).
  const browseGroups = allBrowse;

  return (
    <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px] pb-[16px]">
      {/* 그룹을 "만드는" 건 숲지기의 일이다. 아이 프로필로 볼 때는 여기서
          그룹을 만들 수 없고(찾기·참가만), 숲지기가 되려면 더보기 → 숲지기
          프로필에서 시작한다 -- 아이 화면과 숲지기 화면에 같은 버튼이 있어
          "누가 그룹을 만드는 건지" 헷갈리던 걸 정리. */}
      {/* 이 화면엔 제목이 아예 없어서 어디로 들어온 건지 알기 어려웠다 --
          더보기·그룹 타일의 "+"가 부르는 이름("그룹 찾기")과 맞춘다. */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="d text-xl">그룹 찾기</h1>
        {activeProfile.type === "operator" && (
          <Link
            href="/recommend/create"
            className="d flex-none rounded-[14px] px-4 py-2 text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            + 그룹 만들기
          </Link>
        )}
      </div>

      <Section className="mt-5" title="내 그룹" flush={myGroups.length > 0}>
        {myGroups.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 속한 그룹이 없어요. 아래에서 둘러보거나 초대 코드로 참가해 보세요.
          </p>
        ) : (
          <div className="flex flex-col">
            {myGroups.map((group, index) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 px-[24px] py-[14px]"
                style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
              >
                <Link href={`/recommend/${group.id}`} className="min-w-0 flex-1">
                  <p className="d truncate text-sm">{group.name}</p>
                  <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                    {group.operator_name && `숲지기 ${group.operator_name} · `}
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
      </Section>

      {activeChild && (
        <Section className="mt-5" title="초대 코드로 참가하기" description="선생님·가족에게 받은 6자리 코드를 넣어요.">
          <JoinByCode activeChildId={activeChild.id} />
        </Section>
      )}

      <Section
        className="mt-5"
        title="둘러보기"
        description="숲지기마다 공개 그룹을 옆으로 넘겨 봐요. 그룹을 누르면 추천도서를 미리 보고, + 를 누르면 팔로우해요."
      >
        <BrowseGroups groups={browseGroups} followingIds={activeProfile.type === "operator" ? [] : myGroupIds} activeChildId={activeChild?.id ?? null} />
      </Section>
    </div>
  );
}
