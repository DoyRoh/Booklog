import { childAgeBand } from "@/lib/age-bands";
import Link from "next/link";
import Section from "@/components/section";
import BrowseGroups from "@/components/browse-groups";
import { loadBrowseGroups } from "@/lib/browse-groups";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getRecommendBooks } from "@/lib/recommend-books";
import { getAllAssignments } from "@/lib/assignments";
import { hasVoiceConsent } from "@/lib/consent";
import RecommendShelf from "@/components/recommend-shelf";
import AssignmentsBrowser from "@/components/assignments-browser";
import { CHILD_GROUP_BAR_HEIGHT } from "@/lib/group-bar-height";
import { pickActiveChildGroupId } from "@/lib/active-child-group";
import GroupIntro from "@/components/group-intro";
import Illustration from "@/components/illustration";

type FilterGroup = { id: string; name: string; description?: string | null; operator_name?: string | null; operator_avatar?: string | null };
type SubTab = "books" | "assignments";

// 그룹 탭 -- 숲길(추천도서)과 숙제를 하나로 합쳤다(사용자 요청: "숲길과
// 숙제 메뉴 하단에서 두개는 그룹에 대한 메뉴잖아, 분리하고 싶어"). 둘 다
// "그룹을 고르고 그 안의 내용을 본다"는 같은 구조라, 상단 그룹 전환
// 바(`ChildGroupBar`)는 공유하고 안쪽 내용만 추천도서/숙제 두 소제목
// 탭으로 나눈다. 예전 `/trail`·`/assignments`는 이 화면으로 안내한다.
export default async function GroupPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; tab?: string }>;
}) {
  const { group: groupParam, tab: tabParam } = await searchParams;
  // 기본은 추천도서(사용자 결정: "이 어플 취지에는 추천도서가 먼저인 게 맞다").
  // 숙제는 한 번 더 눌러서 본다.
  const tab: SubTab = tabParam === "assignments" ? "assignments" : "books";
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px]">
        <h1 className="d text-xl">그룹</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);
  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px]">
        <h1 className="d text-xl">그룹</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숲지기의 숙제·추천도서가 여기에 표시돼요. 위쪽 프로필에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  // 0028(operator_avatar) 전이면 그 컬럼 없이 다시 읽는다.
  const loadMemberGroups = (withAvatar: boolean) =>
    supabase
      .from("group_members")
      .select(`groups(id, name, description, operator_name${withAvatar ? ", operator_avatar" : ""})`)
      .eq("child_id", activeChild.id)
      .eq("status", "approved");
  const firstTry = await loadMemberGroups(true);
  const memberGroupRows = firstTry.error ? (await loadMemberGroups(false)).data : firstTry.data;

  const myGroups: FilterGroup[] = (memberGroupRows ?? [])
    .map((row) => row.groups as unknown as FilterGroup | null)
    .filter((g): g is FilterGroup => Boolean(g))
    .filter((g, i, arr) => arr.findIndex((other) => other.id === g.id) === i);

  if (myGroups.length === 0) {
    const browse = await loadBrowseGroups(supabase);
    return (
      <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pt-[20px] pb-[16px]">
        <div className="flex items-end gap-3">
          <Illustration name="bear-lantern" height={110} className="flex-none" />
          <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
            아직 길을 비춰 줄 숲지기가 없어요
          </p>
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          선생님 반이나 도서관 같은 그룹에 들어가면, 숲지기가 골라 준 추천도서와 숙제가 여기에 펼쳐져요.
        </p>
        <Link
          href="/recommend"
          className="d mt-4 block rounded-[14px] py-3 text-center text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          둘러보기 · 초대 코드로 들어가기
        </Link>

        {/* 아직 어디에도 속하지 않았을 때 -- 따라 걸어 볼 만한 공개 그룹을
            이 자리에서 바로 둘러보고 팔로우한다(초대 코드는 위 버튼). */}
        {browse.length > 0 && (
          <Section
            className="mt-5"
            title="둘러보기"
            description="누구나 따라 걸을 수 있는 공개 그룹이에요. 눌러서 추천도서를 미리 보고, 마음에 들면 팔로우해요."
          >
            <BrowseGroups groups={browse} followingIds={[]} activeChildId={activeChild.id} childBand={childAgeBand(activeChild.birthDate)} />
          </Section>
        )}
      </div>
    );
  }

  // 그룹 선택은 두 소제목 탭이 공유한다(children.active_group_id) -- URL의
  // ?group= > 저장된 값 > "전체" 순. 그룹 전환 바 자체는 루트 레이아웃의
  // `ChildGroupBar`가 그린다.
  const selectedId = pickActiveChildGroupId(myGroups, groupParam, activeChild.activeGroupId);
  const selectedGroup = selectedId !== "all" ? (myGroups.find((g) => g.id === selectedId) ?? null) : null;

  let content: React.ReactNode;
  if (tab === "books") {
    const groupsToLoad = selectedGroup ? [selectedGroup] : myGroups;
    const perGroup = await Promise.all(groupsToLoad.map((g) => getRecommendBooks(supabase, g.id, activeChild.id)));
    const seen = new Set<string>();
    const books = perGroup
      .flatMap((r, i) => r.books.map((b) => ({ ...b, groupId: groupsToLoad[i].id })))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .filter((b) => (seen.has(b.bookId) ? false : (seen.add(b.bookId), true)));
    content = (
      <div
        className="rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <RecommendShelf groupId={selectedGroup?.id ?? groupsToLoad[0].id} books={books} activeChildId={activeChild.id} />
      </div>
    );
  } else {
    const [assignments, voiceAllowed] = await Promise.all([
      getAllAssignments(supabase, activeChild.id),
      hasVoiceConsent(supabase, userId),
    ]);
    const visible = selectedId === "all" ? assignments : assignments.filter((a) => a.groupId === selectedId);
    content = (
      <AssignmentsBrowser
        childId={activeChild.id}
        childName={activeChild.name}
        assignments={visible}
        voiceAllowed={voiceAllowed}
        mode="current"
      />
    );
  }

  return (
    // 숙제/추천도서 소제목 탭은 고정 그룹 바(ChildGroupBar) 안으로 옮겼다 --
    // 여기부터는 전부 내용.
    <div className="mx-auto max-w-[520px] md:max-w-[760px] px-5 pb-10" style={{ paddingTop: `${20 + CHILD_GROUP_BAR_HEIGHT}px` }}>
      {/* 고른 그룹의 카드 -- 이름·숲지기·소개와, 이 그룹의 추천도서/숙제를 고르는
          탭이 한 카드에 있어서 "이 그룹 안의 것"으로 읽힌다. */}
      <div className="mb-4 overflow-hidden rounded-[var(--r)] border" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
        <div className="flex items-center gap-3 px-[20px] pt-[16px] pb-[12px]">
          {selectedGroup ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/illustrations/face-${selectedGroup.operator_avatar === "egret" ? "egret" : "bear"}.png`}
              alt=""
              className="h-[40px] w-[40px] flex-none rounded-full"
              style={{ background: "var(--paper)" }}
            />
          ) : (
            <span className="d flex h-[40px] w-[40px] flex-none items-center justify-center rounded-full text-sm" style={{ background: "var(--sprout-pale)", color: "var(--point-deep)" }}>
              {myGroups.length}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="d truncate text-[18px] leading-[24px]">{selectedGroup ? selectedGroup.name : "모든 그룹"}</p>
            <p className="truncate text-[12px]" style={{ color: "var(--ink-2)" }}>
              {selectedGroup ? (selectedGroup.operator_name ?? "숲지기") : `속한 그룹 ${myGroups.length}개`}
            </p>
          </div>
          {selectedGroup && (
            <Link href={`/recommend/${selectedGroup.id}`} className="flex-none text-xs" style={{ color: "var(--ink-2)" }}>
              그룹 정보 ›
            </Link>
          )}
        </div>
        {selectedGroup?.description && <GroupIntro text={selectedGroup.description} className="px-[20px] pb-[12px]" />}
        <div className="flex" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}>
          {(
            [
              { key: "books", label: "추천도서" },
              { key: "assignments", label: "숙제" },
            ] as const
          ).map((t) => {
            const on = t.key === tab;
            const params = new URLSearchParams();
            if (t.key === "assignments") params.set("tab", "assignments");
            if (selectedGroup) params.set("group", selectedGroup.id);
            const qs = params.toString();
            return (
              <Link
                key={t.key}
                href={qs ? `/group?${qs}` : "/group"}
                aria-current={on ? "page" : undefined}
                className="d flex-1 py-3 text-center text-[14px]"
                style={{
                  color: on ? "var(--point-deep)" : "var(--ink-2)",
                  fontWeight: on ? 700 : 600,
                  boxShadow: on ? "inset 0 -3px 0 var(--point-deep)" : "none",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      {content}
    </div>
  );
}
