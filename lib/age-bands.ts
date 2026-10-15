import { kstDate } from "@/lib/kst";

/** 책의 추천 연령 구간(사용자 확정). 한 책에 여러 개 고를 수 있고, 비어 있으면 "연령 미정". */
export const AGE_BANDS = ["infant", "preschool", "lower", "upper", "teen"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  infant: "0~3세",
  preschool: "4~7세",
  lower: "저학년",
  upper: "고학년",
  teen: "청소년",
};

/** 고르는 화면의 보조 설명. */
export const AGE_BAND_HINTS: Record<AgeBand, string> = {
  infant: "글을 모르는 아기",
  preschool: "입학 전",
  lower: "1~3학년",
  upper: "4~6학년",
  teen: "중학생 이상",
};

export function isAgeBand(v: unknown): v is AgeBand {
  return typeof v === "string" && (AGE_BANDS as readonly string[]).includes(v);
}

/** DB 값(text[] | null)을 정해진 순서의 구간 배열로. 모르는 값은 버린다. */
export function parseAgeBands(v: unknown): AgeBand[] {
  if (!Array.isArray(v)) return [];
  return AGE_BANDS.filter((b) => v.includes(b));
}

/**
 * 생년월일 → 아이의 연령 구간.
 * 0~3세는 만 나이, 그 뒤는 한국 입학 기준(출생 연도 + 7년의 3월 입학)으로 학년을 셈.
 */
export function childAgeBand(birthDate: string | null | undefined, today: string = kstDate()): AgeBand | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}/.test(birthDate)) return null;
  const [by, bm, bd] = birthDate.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  if (age < 0) return null;
  const grade = ty - by - (tm >= 3 ? 6 : 7);
  if (grade >= 7) return "teen";
  if (grade >= 4) return "upper";
  if (grade >= 1) return "lower";
  return age < 4 ? "infant" : "preschool";
}

/** 이 책이 이 아이 나이에 안 맞는지 -- 연령 미정이거나 아이 나이를 모르면 false(흐리게 하지 않음). */
export function isOutsideBand(bands: AgeBand[], child: AgeBand | null): boolean {
  if (!child || bands.length === 0) return false;
  return !bands.includes(child);
}

/** 그룹의 연령 분포: 연령이 정해진 책만 센다(한 책이 여러 구간이면 각각 셈). */
export function ageDistribution(bandLists: AgeBand[][]): { band: AgeBand; count: number }[] {
  const counts = new Map<AgeBand, number>();
  for (const bands of bandLists) for (const b of bands) counts.set(b, (counts.get(b) ?? 0) + 1);
  return AGE_BANDS.filter((b) => counts.has(b)).map((band) => ({ band, count: counts.get(band)! }));
}


/** 사서추천도서 엑셀 "대상" 값 → 구간. */
export function nlcyTargetToBands(target: string | null | undefined): AgeBand[] {
  if (!target) return [];
  const t = target.replace(/\s/g, "");
  const out = new Set<AgeBand>();
  if (/영아|영유아/.test(t)) out.add("infant");
  if (/유아/.test(t) && !/영아(?!유)/.test(t)) out.add("preschool");
  if (/저학년|1~3|1-3/.test(t)) out.add("lower");
  if (/고학년|4~6|4-6/.test(t)) out.add("upper");
  if (/청소년|중학|고등/.test(t)) out.add("teen");
  return AGE_BANDS.filter((b) => out.has(b));
}

/** 분포에서 이 그룹의 "주 연령": 연령이 정해진 책의 3분의 1 이상을 차지하는 구간들. */
export function mainAgeBands(ages: { band: AgeBand; count: number }[], agedCount: number): AgeBand[] {
  if (agedCount === 0) return [];
  return ages.filter((a) => a.count * 3 >= agedCount).map((a) => a.band);
}

/** 분포 기준으로 이 그룹이 아이 나이에 맞는지. 연령이 정해진 책이 없으면 null(거르지 않음). */
export function groupFitsBand(ages: { band: AgeBand; count: number }[], agedCount: number, child: AgeBand): boolean | null {
  if (agedCount === 0) return null;
  const hit = ages.find((a) => a.band === child)?.count ?? 0;
  return hit * 3 >= agedCount;
}

/** 칩 한 줄 표기: ["preschool","lower"] → "4~7세·저학년" */
export function ageBandsLabel(bands: AgeBand[]): string {
  return bands.map((b) => AGE_BAND_LABELS[b]).join("·");
}
