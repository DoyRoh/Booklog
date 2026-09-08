import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveProfile } from "@/lib/active-profile";
import SignOutButton from "@/components/sign-out-button";
import ChildSwitcher from "@/components/child-switcher";
import OperatorProfileSwitcher, { type OperatorGroup } from "@/components/operator-profile-switcher";
import ChildShare from "@/components/child-share";
import ShelfTagManager from "@/components/shelf-tag-manager";
import Illustration from "@/components/illustration";

export default async function MorePage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">더보기</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 화면에 이메일도 보여줘야 하는데, users 테이블에 이미 email이 복제돼
  // 있어서(가입 시 트리거) auth.getUser()로 다시 왕복하지 않고 이 조회에
  // 같이 얹는다. 서로 무관한 조회 셋(프로필, 아이 목록, 운영 중인 그룹
  // 목록)을 동시에 왕복한다.
  const [{ data: profile }, { data: guardianRows, error: guardianError }, { data: operatorRows }, activeProfile] =
    await Promise.all([
    supabase.from("users").select("email, active_child_id").eq("id", userId).single(),
    supabase
      .from("child_guardians")
      .select("children(id, name, avatar, birth_date, invite_code)")
      .eq("user_id", userId),
    supabase
      .from("group_members")
      .select("role, groups(id, name, type)")
      .eq("user_id", userId)
      .eq("status", "approved")
      .in("role", ["teacher", "admin", "curator"]),
    getActiveProfile(supabase, userId),
  ]);

  type ChildRow = {
    id: string;
    name: string;
    avatar: "rabbit" | "dog" | "cat" | null;
    birth_date: string | null;
    invite_code: string | null;
  };
  const children = (guardianRows ?? [])
    .map((row) => row.children as unknown as ChildRow | null)
    .filter((child): child is ChildRow => Boolean(child));

  type GroupRow = { id: string; name: string; type: string };
  const operatorGroups: OperatorGroup[] = (operatorRows ?? [])
    .map((row) => {
      const group = row.groups as unknown as GroupRow | null;
      if (!group) return null;
      return {
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        operatorRole: row.role as "teacher" | "admin" | "curator",
      };
    })
    .filter((g): g is OperatorGroup => Boolean(g));

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <h1 className="d text-xl">더보기</h1>

      <div
        className="mt-6 flex items-center justify-between gap-3 rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <p className="text-sm">{profile?.email}</p>
        <SignOutButton />
      </div>

      {/* 계정 하나가 아이 프로필(들)과 선생님/기관 프로필(들)을 동시에 가질
          수 있다 -- 예전처럼 계정을 나눠 만들 필요 없이, 여기서 프로필을
          고르면 그 프로필 기준으로 하단 탭·화면이 바뀐다. */}
      <div className="mt-8">
        <p className="d text-base">프로필</p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
          지금 어떤 프로필로 볼지 골라 주세요. 언제든 여기서 바꿀 수 있어요.
        </p>

        <div className="mt-3">
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            아이 프로필
          </p>
          {guardianError && (
            <p className="mt-2 text-sm" style={{ color: "var(--berry)" }}>
              아이 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. ({guardianError.message})
            </p>
          )}
          <div className="mt-2">
            <ChildSwitcher
              userId={userId}
              childList={children}
              activeChildId={activeProfile.type === "child" ? profile?.active_child_id ?? null : null}
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            선생님 / 기관 프로필
          </p>
          <div className="mt-2">
            <OperatorProfileSwitcher
              userId={userId}
              groups={operatorGroups}
              isActive={activeProfile.type === "operator"}
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        {/* 하얀 새가 편지를 물어다 주는 장면 -- 공유 코드가 곧 편지. */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="d text-base">책장 공유</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              배우자·조부모 같은 다른 보호자를 초대해서 같은 아이의 책장을 함께 보고 기록할 수 있어요.
            </p>
          </div>
          <Illustration name="bird-letter" height={56} className="flex-none" />
        </div>
        <div className="mt-3">
          <ChildShare
            childList={children.map((child) => ({ id: child.id, name: child.name, inviteCode: child.invite_code }))}
          />
        </div>
      </div>

      {(profile?.active_child_id ?? children[0]?.id) && (
        <div className="mt-8">
          <p className="d text-base">책장 나누기</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            &quot;6살 책장&quot;, &quot;7살 책장&quot;처럼 나눠 둔 책장의 이름을 바꾸거나 지울 수 있어요.
          </p>
          <div className="mt-3">
            <ShelfTagManager childId={(profile?.active_child_id ?? children[0]?.id) as string} />
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-8">
          <p className="d text-base">그룹 둘러보기</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 안 속한 기관·크리에이터 그룹을 찾아 팔로우하거나, 초대 코드로 학급에 참가할 수 있어요.
          </p>
          <Link
            href="/recommend"
            className="mt-2 block rounded-[var(--r)] border p-4 text-sm"
            style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
          >
            새 그룹 찾기
          </Link>
        </div>
      )}
    </div>
  );
}
