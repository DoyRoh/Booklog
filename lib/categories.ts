// 그룹 추천도서를 분야별로 묶어 보여줄 때 쓰는 표준 카테고리 목록.
// DB(book_categories.category)는 자유 텍스트라 새 값도 저장은 되지만,
// 화면의 칩·필터는 이 목록 기준으로 뜬다.
export const BOOK_CATEGORIES = ["한글", "수학", "과학", "인성", "세계", "창작", "명작"] as const;
export type BookCategory = (typeof BOOK_CATEGORIES)[number];
