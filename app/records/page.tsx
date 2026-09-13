import { redirect } from "next/navigation";

// 기록 탭은 책장 탭의 "목록 보기"로 합쳐졌다 -- 예전 링크·북마크는 여기로 보낸다.
export default function RecordsPage() {
  redirect("/library?view=list");
}
