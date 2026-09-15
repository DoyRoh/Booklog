// groups.type 값을 화면에 보여줄 한글 라벨로 바꾼다. 4개 화면(교사/큐레이터
// 대시보드, 추천 탭, 그룹 상세)에 똑같은 객체가 각각 따로 정의돼 있던 걸
// 한 곳으로 모았다.
export const GROUP_TYPE_LABELS: Record<string, string> = {
  kindergarten: "유치원",
  school: "학교",
  library: "도서관",
  family: "가족",
  community: "커뮤니티",
  creator: "크리에이터",
};
