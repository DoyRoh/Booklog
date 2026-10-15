// 사서추천도서 분류 -- 그룹 이름은 supabase/seed/nlcy_keeper.sql과 같아야 한다.
export const NLCY_CATEGORIES = [
  { key: "infant", code: "_nlcy_normal0801", tab: "유아", groupName: "사서추천도서 · 유아" },
  { key: "lower", code: "_nlcy_normal0802", tab: "초등저학년", groupName: "사서추천도서 · 초등 저학년" },
  { key: "upper", code: "_nlcy_normal0803", tab: "초등고학년", groupName: "사서추천도서 · 초등 고학년" },
  { key: "teen", code: "_nlcy_normal0804", tab: "청소년", groupName: "사서추천도서 · 청소년" },
  { key: "theme", code: "_nlcy_normal0805", tab: "테마", groupName: "사서추천도서 · 테마" },
] as const;
export type NlcyCategoryKey = (typeof NLCY_CATEGORIES)[number]["key"];

