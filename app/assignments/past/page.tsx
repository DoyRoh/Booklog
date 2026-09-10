import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { getAllAssignments } from "@/lib/assignments";
import AssignmentsBrowser from "@/components/assignments-browser";

// 지난 숙제 -- 이번 주 전에 끝난 숙제 전부(최근 것부터). 검색은 숙제 탭과 같다.
export default async function PastAssignmentsPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-6 pt-8">
        <h1 className="d text-xl">지난 숙제</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);
  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-6 pt-8">
        <h1 className="d text-xl">지난 숙제</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숙제가 여기에 표시돼요.
        </p>
      </div>
    );
  }

  const [assignments, voiceAllowed] = await Promise.all([
    getAllAssignments(supabase, activeChild.id),
    hasVoiceConsent(supabase, userId),
  ]);

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
      <Link href="/assignments" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 숙제
      </Link>
      <h1 className="d mt-2 mb-4 text-xl">지난 숙제</h1>
      <AssignmentsBrowser
        childId={activeChild.id}
        childName={activeChild.name}
        assignments={assignments}
        voiceAllowed={voiceAllowed}
        mode="past"
      />
    </div>
  );
}
