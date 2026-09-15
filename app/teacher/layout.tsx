import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import SwitchToOperator from "@/components/switch-to-operator";

/**
 * 숲지기 화면(/teacher/**)은 **숲지기 프로필로 보고 있을 때만** 연다.
 * 예전엔 각 화면이 "이 계정이 그룹을 운영하는가"만 봐서, 아이 프로필로
 * 보는 중에도 링크만 타면 대시보드가 열렸다 -- 그런데 하단 탭은 아이
 * 탭 그대로라 화면이 뒤죽박죽으로 보였다(사용자 지적: "어린이 계정
 * 선택한 상태에서 숲지기 대시보드에 들어가진다"). 그룹 상세 화면에
 * 이미 적용해 둔 규칙(관리 화면은 운영진 + 숲지기 프로필일 때만)을
 * 숲지기 화면 전체로 넓힌 것이다.
 *
 * 레이아웃 한 곳에서 막으면 /teacher 아래 모든 화면이 한 번에 지켜진다.
 * 조회는 users 한 줄(컬럼 하나)이고 각 화면의 조회와 병렬로 돈다.
 */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const userId = await getVerifiedUserId();
  if (!userId) return <>{children}</>;

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("active_profile_type")
    .eq("id", userId)
    .single();

  if (user?.active_profile_type === "operator") return <>{children}</>;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-[20px] pb-[16px]">
      <h1 className="d text-xl">숲지기 화면</h1>
      <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        지금은 <b>아이 프로필</b>로 보고 있어요. 숲지기 화면(대시보드·아이들·추천도서·숙제)은 숲지기 프로필로
        바꾼 뒤에 열려요 — 바꾸면 아래 메뉴도 숲지기 것으로 함께 바뀝니다.
      </p>
      <SwitchToOperator userId={userId} />
      <Link href="/more" className="d mt-3 block text-center text-sm" style={{ color: "var(--ink-2)" }}>
        프로필 · 설정으로 돌아가기
      </Link>
    </div>
  );
}
