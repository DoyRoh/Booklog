import type { TodayAssignment } from "@/components/assignment-today";

// 완료 조건은 기존 그대로: 책이 하나 이상이고, 전부 완료(assignment_completion 뷰
// 기준 -- 완독 또는 부분 읽기 목표 달성)일 때만 숙제 전체 완료.
//
// 반드시 이 "use client"가 아닌 모듈에 둔다: assignment-today.tsx는 "use client"
// 파일이라, 거기서 export한 함수를 서버 컴포넌트(assignment-summary.tsx 등)가
// import해 직접 호출하면 실제 함수가 아니라 클라이언트 참조 프록시가 넘어와
// 렌더링 중 예외로 죽는다(lib/group-bar-height.ts와 같은 클래스의 버그, 실제로
// 겪음 -- 오늘 탭 전체가 "먹통"이 됐던 원인). TodayAssignment는 타입만 가져오는
// 것이라(런타임에 지워짐) 안전하다.
export function isAssignmentDone(a: Pick<TodayAssignment, "books">): boolean {
  return a.books.length > 0 && a.books.every((b) => b.completed);
}
