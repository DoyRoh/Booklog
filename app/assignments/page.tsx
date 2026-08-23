import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { getActiveAndUpcomingAssignments } from "@/lib/assignments";
import AssignmentToday from "@/components/assignment-today";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숙제</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">숙제</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숙제가 여기에 표시돼요. 더보기에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const [assignments, voiceAllowed] = await Promise.all([
    getActiveAndUpcomingAssignments(supabase, activeChild.id),
    hasVoiceConsent(supabase, userId),
  ]);

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      {assignments.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          지금 진행 중이거나 예정된 숙제가 없어요.
        </p>
      ) : (
        <AssignmentToday
          childId={activeChild.id}
          childName={activeChild.name}
          assignments={assignments}
          voiceAllowed={voiceAllowed}
        />
      )}

      <Link
        href="/assignments/past"
        className="d mt-8 block rounded-[14px] border py-3 text-center text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
      >
        지난 숙제 보기
      </Link>
    </div>
  );
}
