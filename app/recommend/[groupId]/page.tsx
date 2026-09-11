import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getProfileSnapshot } from "@/lib/profile-snapshot";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import { getRecommendBooks } from "@/lib/recommend-books";
import GroupApprovals from "@/components/group-approvals";
import GroupFollow from "@/components/group-follow";
import GroupIntroEditor from "@/components/group-intro-editor";
import GroupRemoveButton from "@/components/group-remove-button";
import Section from "@/components/section";
import RecommendShelf from "@/components/recommend-shelf";

// 팔로우 전 미리보기로 보여줄 추천도서 수. 전부 공개하면 팔로우할 이유가
// 없고, 아예 안 보이면 "어떤 그룹인지" 고를 수가 없다.
const PREVIEW_LIMIT = 10;

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href="/login" className="text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 서로 무관한 조회 넷(그룹 정보, 내 운영진 멤버십, 활성 아이, 활성
  // 프로필)을 먼저 동시에 왕복한다 -- 추천도서 목록은 활성 아이 id가
  // 있어야 조회할 수 있어서 그 다음 단계로 미룬다.
  const [{ data: group }, { data: myMembership }, { activeChild, activeProfile }] = await Promise.all([
    supabase.from("groups").select("id, name, type, join_policy, invite_code, description, owner_id, operator_name").eq("id", groupId).single(),
    supabase
      .from("group_members")
      .select("role, status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle(),
    getProfileSnapshot(supabase, userId),
  ]);

  if (!group) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">그룹</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          그룹을 찾을 수 없어요.
        </p>
        <Link href="/recommend" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          그룹 목록으로
        </Link>
      </div>
    );
  }

  // 같은 계정이 이 그룹의 숲지기이면서 아이 프로필로 들어올 수 있다.
  // 관리 화면은 "운영진이고 + 지금 숲지기 프로필로 보고 있을 때"만 --
  // 아이 프로필로 보면 다른 그룹원과 똑같은 둘러보기 화면을 본다.
  const isOperatorMember =
    myMembership?.role === "teacher" ||
    myMembership?.role === "admin" ||
    myMembership?.role === "curator";
  const isOperator = isOperatorMember && activeProfile.type === "operator";

  // 셋 다 activeChild.id/groupId에만 의존하고 서로 무관하므로 동시에
  // 왕복한다. 추천도서 목록 조회는 lib/recommend-books.ts로 옮겨서
  // 숲길 탭(그룹 필터)과 로직을 공유한다.
  const [{ data: childMembership }, { bookListId, books: recommendBooks }, { data: pendingRows }] =
    await Promise.all([
      activeChild
        ? supabase
            .from("group_members")
            .select("id")
            .eq("group_id", groupId)
            .eq("child_id", activeChild.id)
            .eq("status", "approved")
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getRecommendBooks(supabase, groupId, activeChild?.id ?? null),
      isOperator
        ? supabase.from("group_members").select("id, children(name)").eq("group_id", groupId).eq("status", "pending")
        : Promise.resolve({ data: [] }),
    ]);

  // 아이 보기에서 "팔로잉/참가 중"은 아이 자신의 멤버십으로만 판단한다
  // (숲지기 계정이라고 아이가 자동으로 그룹원인 건 아니다).
  const isChildMember = Boolean(childMembership);

  const pending = (pendingRows ?? [])
    .map((row) => ({
      id: row.id,
      childName: (row.children as unknown as { name: string } | null)?.name ?? "",
    }))
    .filter((row) => row.childName);

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/recommend" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 그룹 목록
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="d text-xl">{group.name}</h1>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            {group.operator_name && (
              <>
                <span style={{ color: "var(--point-deep)" }}>숲지기 {group.operator_name}</span>
                {" · "}
              </>
            )}
            {GROUP_TYPE_LABELS[group.type] ?? group.type}
            {isOperatorMember && !isOperator && " · 내가 운영하는 그룹"}
          </p>
        </div>
        {!isOperator && (
          <GroupFollow
            groupId={group.id}
            joinPolicy={group.join_policy}
            activeChildId={activeChild?.id ?? null}
            isMember={isChildMember}
          />
        )}
      </div>

      {isOperator ? (
        <div className="mt-4">
          <GroupIntroEditor
            groupId={group.id}
            initialName={group.name}
            initialType={group.type}
            initial={group.description}
          />
        </div>
      ) : (
        group.description && (
          <p className="mt-4 whitespace-pre-line text-sm">{group.description}</p>
        )
      )}

      {!isOperator && !isChildMember && (
        <p className="mt-3 text-xs" style={{ color: "var(--ink-2)" }}>
          {group.join_policy === "open"
            ? "팔로우하면 그룹 탭에 이 그룹이 생기고, 책갈피로 내 책장에 꽂을 수 있어요."
            : "초대 코드로 참가하면 그룹 탭에 이 그룹이 생기고, 숙제도 받아요."}
        </p>
      )}

      {isOperator && group.join_policy === "approval" && group.invite_code && (
        <div
          className="mt-4 rounded-[var(--r)] border p-4"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            초대 코드
          </p>
          <p className="d text-base">{group.invite_code}</p>
        </div>
      )}

      {isOperator && group.join_policy === "approval" && (
        <Section className="mt-5" title="가입 승인 대기" description={pending.length > 0 ? `${pending.length}명이 기다리고 있어요` : undefined}>
          <GroupApprovals pending={pending} />
        </Section>
      )}

      {/* 이 화면은 그룹 자체(이름·소개·유형·승인·삭제)를 만지는 "그룹
          설정"이다. 책·숙제 내용을 채우는 건 숲지기의 추천도서·숙제
          탭에서 하나로 통일한다 -- 여기 또 검색·올리기 폼이 있으면
          "관리를 들어가도 추가 기능이 또 있다"는 중복 진입점이 된다.
          그래서 두 섹션 모두 전용 화면으로 가는 링크 하나씩만 둔다. */}
      {isOperator && bookListId && (
        <Section
          className="mt-5"
          title="추천도서"
          description={`올린 책 ${recommendBooks.length}권`}
          action={
            <Link href={`/teacher/books?group=${groupId}`} className="text-xs" style={{ color: "var(--point)" }}>
              관리 ›
            </Link>
          }
        >
          <Link
            href={`/teacher/books/add?group=${groupId}`}
            className="d block rounded-[14px] border border-dashed px-4 py-3 text-center text-sm"
            style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
          >
            + 책 추가
          </Link>
        </Section>
      )}

      {isOperator ? (
        <div className="mt-5" id="assignment">
          <Section title="숙제" description="읽을 책을 찾아 넣고 언제까지인지 정해요.">
            <Link
              href={`/teacher/assignments/new?group=${groupId}`}
              className="d block rounded-[14px] border border-dashed px-4 py-3 text-center text-sm"
              style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
            >
              + 새 숙제 만들기
            </Link>
          </Section>
        </div>
      ) : (
        <div className="mt-6">
          <p className="d mb-2 text-base">추천도서</p>
          {/* 팔로우 전에는 미리보기 -- 최근 올라온 10권까지만, 표지만
              둘러보고(책갈피·체크 토글 없음). 팔로우한 뒤부터 전부 보이고
              내 책장에 꽂고 읽음 표시를 할 수 있다. */}
          <RecommendShelf
            groupId={groupId}
            books={isChildMember ? recommendBooks : recommendBooks.slice(0, PREVIEW_LIMIT)}
            activeChildId={isChildMember ? (activeChild?.id ?? null) : null}
            footnote={
              !isChildMember && recommendBooks.length > PREVIEW_LIMIT
                ? `미리보기 ${PREVIEW_LIMIT}권 · 팔로우하면 ${recommendBooks.length}권 전부 볼 수 있어요`
                : !isChildMember && recommendBooks.length > 0
                  ? "팔로우하면 책갈피로 내 책장에 꽂을 수 있어요"
                  : undefined
            }
          />
        </div>
      )}

      {/* 그룹 정리: 그룹장은 삭제, 그룹장이 아닌 운영진은 운영 그만두기.
          지우면 그룹 목록으로 돌아간다. */}
      {isOperator && (
        <div
          className="mt-10 flex items-center justify-between gap-3 border-t pt-4"
          style={{ borderColor: "rgba(38,54,43,0.08)" }}
        >
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            {group.owner_id === userId
              ? "그룹을 지우면 추천도서·숙제도 함께 지워져요. 아이들의 독서기록은 남아요."
              : "운영을 그만두면 그룹은 남고 내 숲지기 목록에서만 빠져요."}
          </p>
          <GroupRemoveButton
            groupId={group.id}
            groupName={group.name}
            mode={group.owner_id === userId ? { kind: "delete" } : { kind: "leave-operator", userId }}
            afterHref="/teacher"
          />
        </div>
      )}
    </div>
  );
}
