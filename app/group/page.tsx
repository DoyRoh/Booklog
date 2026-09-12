import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { getRecommendBooks } from "@/lib/recommend-books";
import { getAllAssignments } from "@/lib/assignments";
import { hasVoiceConsent } from "@/lib/consent";
import RecommendShelf from "@/components/recommend-shelf";
import AssignmentsBrowser from "@/components/assignments-browser";
import Section from "@/components/section";
import { CHILD_GROUP_BAR_HEIGHT } from "@/lib/group-bar-height";
import { pickActiveChildGroupId } from "@/lib/active-child-group";
import Illustration from "@/components/illustration";

type FilterGroup = { id: string; name: string };
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
  // 기본은 숙제 -- 그룹 탭에 들어오는 가장 흔한 이유가 "오늘 뭐 해야 하지"라서
  // 할 일을 먼저 보여주고, 둘러보기(추천도서)는 한 번 더 눌러서 본다.
  const tab: SubTab = tabParam === "books" ? "books" : "assignments";
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
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
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
        <h1 className="d text-xl">그룹</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숲지기의 숙제·추천도서가 여기에 표시돼요. 위쪽 프로필에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const { data: memberGroupRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("child_id", activeChild.id)
    .eq("status", "approved");

  const myGroups: FilterGroup[] = (memberGroupRows ?? [])
    .map((row) => row.groups as unknown as FilterGroup | null)
    .filter((g): g is FilterGroup => Boolean(g))
    .filter((g, i, arr) => arr.findIndex((other) => other.id === g.id) === i);

  if (myGroups.length === 0) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px] pb-[16px]">
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
          그룹 찾기 · 초대 코드로 들어가기
        </Link>
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
      <>
        {/* 그룹명은 박스 밖(사용자 지적: "그룹명이 흰 박스가 아니라 밖에 따로
            나와야할 것 같아") -- 그 아래 실제 내용(분야 칩·권수·책 선반)은
            /recommend/[groupId]와 같은 패턴으로 흰 카드 안에 담는다(사용자
            지적: "아이 내용은 흰 카드 안에 둬야지 너무 정신 사납다"). */}
        <h1 className="d text-xl">{selectedGroup ? `${selectedGroup.name}의 추천도서` : "모든 그룹의 추천도서"}</h1>
        <Section className="mt-4" title="추천도서">
          <RecommendShelf groupId={selectedGroup?.id ?? groupsToLoad[0].id} books={books} activeChildId={activeChild.id} />
        </Section>
      </>
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
    <div className="mx-auto max-w-[520px] px-5 pb-10" style={{ paddingTop: `${20 + CHILD_GROUP_BAR_HEIGHT}px` }}>
      {content}
    </div>
  );
}
