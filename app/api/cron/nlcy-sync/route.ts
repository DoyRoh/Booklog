import { NextResponse } from "next/server";
import { syncNlcyRecommendations } from "@/lib/nlcy-sync";

export const maxDuration = 60;

// Vercel Cron이 매일 호출하는 경로. Vercel은 CRON_SECRET 환경변수가
// 설정돼 있으면 Cron 요청에 `Authorization: Bearer $CRON_SECRET` 헤더를
// 자동으로 실어 보내므로, 그 값만 대조하면 외부에서 함부로 못 부른다.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
