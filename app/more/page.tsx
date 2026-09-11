import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveProfile } from "@/lib/active-profile";
import SignOutButton from "@/components/sign-out-button";
import ChildSwitcher from "@/components/child-switcher";
import OperatorProfileSwitcher, { type OperatorGroup } from "@/components/operator-profile-switcher";
import Section from "@/components/section";
import ProfileModeSwitch from "@/components/profile-mode-switch";

export default async function MorePage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
        <h1 className="d text-xl">프로필 · 설정</h1>
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
    supabase.from("users").select("email, active_child_id, operator_avatar, operator_name").eq("id", userId).single(),
    supabase
      .from("child_guardians")
      .select("children(id, name, avatar, birth_date)")
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
    <div className="mx-auto max-w-[520px] px-5 pt-[20px] pb-[16px]">
      <h1 className="d text-xl">프로필 · 설정</h1>

      <div
        className="mt-5 flex items-center justify-between gap-3 rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <p className="text-sm">{profile?.email}</p>
        <SignOutButton />
      </div>

      {/* 계정 하나가 아이 프로필(들)과 숲지기 프로필(들)을 동시에 가질
          수 있다 -- 예전처럼 계정을 나눠 만들 필요 없이, 여기서 프로필을
          고르면 그 프로필 기준으로 하단 탭·화면이 바뀐다. */}
      <Section className="mt-5" title="프로필" description="지금 어떤 프로필로 볼지 골라 주세요. 언제든 여기서 바꿀 수 있어요.">
        <ProfileModeSwitch
          userId={userId}
          mode={activeProfile.type}
          childName={children.find((c) => c.id === profile?.active_child_id)?.name ?? children[0]?.name ?? null}
          operatorName={(profile?.operator_name as string | null) ?? null}
          hasChild={children.length > 0}
          hasOperator={operatorGroups.length > 0}
        />

        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            아이 프로필 <span style={{ opacity: 0.7 }}>· 아이가 여럿이면 여기서 골라요</span>
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

        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            숲지기 프로필 <span style={{ opacity: 0.7 }}>· 그룹을 만들어 운영하는 사람 — 선생님도, 가족도, 도서관도</span>
          </p>
          <div className="mt-2">
            <OperatorProfileSwitcher
              userId={userId}
              groups={operatorGroups}
              avatar={(profile?.operator_avatar as "bear" | "egret" | null) ?? null}
              operatorName={(profile?.operator_name as string | null) ?? null}
            />
          </div>
        </div>
      </Section>

      {children.length > 0 && (
        <Section
          className="mt-5"
          title="그룹 찾기 · 참가"
          description={
            <>
              아이는 그룹에 <b>참가</b>해요 — 초대 코드로 학급이나 가족 그룹에 들어가거나, 도서관·크리에이터의
              추천도서를 팔로우해요. 그룹을 직접 만들어 운영하려면 위의 숲지기 프로필에서 시작해요.
            </>
          }
        >
          <Link href="/recommend" className="d block text-sm" style={{ color: "var(--point-deep)" }}>
            새 그룹 찾기 ›
          </Link>
        </Section>
      )}
    </div>
  );
}
