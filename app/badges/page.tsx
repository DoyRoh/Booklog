import { redirect } from "next/navigation";

// 배지 화면은 "우리 숲"으로 합쳐졌다 -- 예전 링크는 여기로.
export default function BadgesPage() {
  redirect("/forest");
}
