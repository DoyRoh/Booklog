// "어떤 기분이 들었어?" -- 책을 읽고 난 느낌 여덟 가지. "책은 어땠어?"
// 스티커(최고~별로)가 1~5점 척도라 "얼마나 좋았나"만 담기고, 무서웠다·
// 슬펐다 같은 "어떤 느낌이었나"는 담을 자리가 없다는 아이들 피드백으로
// 축을 따로 뒀다. 여러 개를 고를 수 있고, reading_records.emotion(text)에
// 아래 key를 쉼표로 이어 저장한다(마이그레이션 없음 -- 예전 기분 칩이
// 쓰던 컬럼을 그대로 재사용).
//
// 순서 = 화면에 두 줄(4×2)로 놓이는 순서. 서버 컴포넌트에서도 쓰이므로
// 아이콘(React)은 여기 두지 않고 components/feeling-picker.tsx에 둔다.

export const FEELINGS = [
  { key: "scared", label: "무서웠어", color: "var(--c-teal)" },
  { key: "funny", label: "웃겼어", color: "var(--c-yellow)" },
  { key: "sad", label: "슬펐어", color: "var(--c-blue)" },
  { key: "wow", label: "신기했어", color: "var(--c-orange)" },
  { key: "touched", label: "뭉클했어", color: "var(--c-purple)" },
  { key: "excited", label: "두근두근", color: "var(--c-pink)" },
  { key: "angry", label: "화났어", color: "var(--c-red)" },
  { key: "warm", label: "따뜻했어", color: "var(--c-green)" },
] as const;

export type FeelingKey = (typeof FEELINGS)[number]["key"];

const KEYS = new Set<string>(FEELINGS.map((f) => f.key));

/** emotion 컬럼 값 → 고른 기분 key 목록(모르는 값은 버림). */
export function parseFeelings(text: string | null | undefined): FeelingKey[] {
  if (!text) return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is FeelingKey => KEYS.has(s));
}

/** 고른 기분 key 목록 → emotion 컬럼 값(없으면 null). 항상 FEELINGS 순서로. */
export function serializeFeelings(keys: readonly string[]): string | null {
  const picked = FEELINGS.filter((f) => keys.includes(f.key)).map((f) => f.key);
  return picked.length > 0 ? picked.join(",") : null;
}

/** 목록 화면용 -- "무서웠어 · 웃겼어". key가 하나도 없으면(예전 기분 칩
 *  문자열 등) 원문을 그대로 돌려준다. */
export function feelingLabels(text: string | null | undefined): string | null {
  if (!text) return null;
  const keys = parseFeelings(text);
  if (keys.length === 0) return text;
  return FEELINGS.filter((f) => keys.includes(f.key))
    .map((f) => f.label)
    .join(" · ");
}
