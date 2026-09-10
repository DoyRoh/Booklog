import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { loadBadges } from "@/lib/badge-data";
import ForestView from "@/components/forest-view";
import BadgeGrid from "@/components/badge-grid";

// 우리 숲 = 배지 화면. 위엔 딴 배지로 이루어진 숲 장면, 아래엔 배지 목록.
// (예전엔 /badges와 /forest가 따로였는데 같은 시스템이라 하나로 합쳤다.)
export default async function ForestPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-6 pt-8">
        <h1 className="d text-xl">우리 숲</h1>
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
        <h1 className="d text-xl">우리 숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숲이 여기에 자라요. 더보기에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const badges = await loadBadges(supabase, activeChild.id);

  return (
    <div className="mx-auto max-w-[520px] px-6 pt-8 pb-10">
      <ForestView childName={activeChild.name} avatar={activeChild.avatar} badges={badges} />
      <div className="mx-1 mt-8" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />
      <BadgeGrid badges={badges} avatar={activeChild.avatar} />
    </div>
  );
}
