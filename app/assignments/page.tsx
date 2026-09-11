import { redirect } from "next/navigation";

// 숙제 탭은 '그룹' 탭(추천도서/숙제 소제목 탭)으로 합쳐졌다(사용자 요청:
// "숲길과 숙제 메뉴 하단에서 두개는 그룹에 대한 메뉴잖아, 분리하고
// 싶어" -> 하나의 탭으로 합침을 선택). 예전 링크·북마크가 계속 동작하도록
// ?group= 쿼리를 그대로 이어 /group?tab=assignments로 보낸다. /assignments/past
// (지난 숙제)는 그대로 이 경로에 남아 있다.
export default async function AssignmentsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  redirect(`/group?tab=assignments${group ? `&group=${group}` : ""}`);
}
