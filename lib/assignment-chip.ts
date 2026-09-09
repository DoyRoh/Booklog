import type { LogChip } from "@/components/log-row";

// 숙제 목록 줄의 칩 -- 숙제에 붙은 미션 종류로 색을 나눈다(추천도서 목록의
// 분야 칩과 같은 자리). 책만 읽는 숙제는 "읽기", 질문 답하기가 있으면
// "질문", 낭독 녹음이 있으면 "낭독". 둘 이상이면 첫 번째가 칩, 두 번째가
// 칩 아래 작은 글자.
const KIND: Record<string, { label: string; color: string }> = {
  read: { label: "읽기", color: "#2FA84F" },
  question: { label: "질문", color: "#3B82C4" },
  voice: { label: "낭독", color: "#E8A33D" },
};

export function missionChip(missions: { type: string }[]): LogChip {
  const kinds: string[] = [];
  for (const m of missions) {
    const k = m.type === "question" || m.type === "voice" ? m.type : "read";
    if (!kinds.includes(k)) kinds.push(k);
  }
  if (kinds.length === 0) kinds.push("read");
  const [a, b] = kinds;
  return { label: KIND[a].label, color: KIND[a].color, sub: b ? KIND[b].label : undefined };
}
