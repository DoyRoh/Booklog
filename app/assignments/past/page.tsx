import { redirect } from "next/navigation";

// 지난 숙제도 '그룹' 탭 아래(/group/past)로 옮겼다 -- 그룹에 관한 화면은
// 전부 /group 아래 한곳에 모은다. 예전 링크·북마크는 여기로 보낸다.
export default function PastAssignmentsRedirectPage() {
  redirect("/group/past");
}
