// 그룹 추천도서를 분야별로 묶어 보여줄 때 쓰는 표준 카테고리 목록.
// DB(book_categories.category)는 자유 텍스트라 새 값도 저장은 되지만,
// 화면의 칩·필터는 이 목록 기준으로 뜬다.
export const BOOK_CATEGORIES = ["한글", "수학", "과학", "인성", "세계", "창작", "명작", "기타"] as const;
export type BookCategory = (typeof BOOK_CATEGORIES)[number];

// 목록 줄의 분야 칩 색 -- 분야마다 다른 색이라 아이도 한눈에 구분한다.
// 표준 목록 외의 분야(기관 데이터 등)도 "기타"와 같은 회색.
export const CATEGORY_COLORS: Record<string, string> = {
  한글: "#3B82C4",
  수학: "#E8A33D",
  과학: "#2FA84F",
  인성: "#D94A32",
  세계: "#7B61C7",
  창작: "#E07A9A",
  명작: "#2A9D8F",
  기타: "#8A958C",
};

export function categoryColor(name: string | null | undefined): string {
  return (name && CATEGORY_COLORS[name]) || "#8A958C";
}
