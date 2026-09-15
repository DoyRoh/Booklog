import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { syncNlcyRecommendations } from "@/lib/nlcy-sync";

export const maxDuration = 60;

// 큐레이터 대시보드의 "지금 동기화" 버튼이 부르는 경로. 이 계정이
// 국립어린이청소년도서관 큐레이터 본인인지까지는 확인하지 않고 role만
// 확인한다 -- 어차피 sync 로직 자체가 항상 그 하나의 고정 그룹만 건드리는
// 멱등적인 동작이라, 다른 큐레이터가 눌러도 자기 그룹엔 아무 영향이 없다.
export async function POST() {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("users").select("role").eq("id", userId).single();
  if (profile?.role !== "curator") {
    return NextResponse.json({ error: "큐레이터 계정만 동기화할 수 있어요." }, { status: 403 });
  }

  try {
    const result = await syncNlcyRecommendations();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "동기화 중 알 수 없는 오류가 발생했어요." },
      { status: 500 }
    );
  }
}
