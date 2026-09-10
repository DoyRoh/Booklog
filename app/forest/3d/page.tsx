import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { loadBadges } from "@/lib/badge-data";
import Forest3DScreen from "@/components/forest-3d-screen";

// 우리 숲 3D -- 딴 배지가 나무·별·등불·새·버섯이 되어 서 있는 작은 숲을
// 손가락으로 돌려 보는 화면. 데이터는 /forest와 같다(배지만).
export default async function Forest3DPage() {
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

  const activeChild = await getActiveChild(supabase, userId);
  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">우리 숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숲이 여기에 자라요.
        </p>
      </div>
    );
  }

  const badges = await loadBadges(supabase, activeChild.id);

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/forest" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 우리 숲
      </Link>
      <div className="mt-3">
        <Forest3DScreen childName={activeChild.name} avatar={activeChild.avatar} badges={badges} />
      </div>
    </div>
  );
}
