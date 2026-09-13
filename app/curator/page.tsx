import { redirect } from "next/navigation";

// 예전 큐레이터 대시보드. 선생님·기관·인플루언서를 "숲지기" 하나로 합치면서
// 화면도 하나(/teacher)로 합쳤다 -- 북마크·옛 링크를 위해 경로만 남겨 둔다.
export default function CuratorDashboardPage() {
  redirect("/teacher");
}
