import { kstDate, kstWeekStart } from "@/lib/kst";

// 숙제 기간 규칙(화면 전부가 공유):
//  - 시작일이 없으면 만든 날이 시작일.
//  - 마감이 없으면 시작일부터 일주일(6일 뒤까지). 마감 없는 숙제가 "영원히
//    진행 중"으로 남아, 숙제 탭 메인에 8/19 것이 계속 뜨고 정작 더 최근
//    숙제(마감 지남)는 "지난 숙제"에만 보이던 문제의 원인이었다.
export type PeriodLike = { startDate: string | null; endDate: string | null; createdAt: string };

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function effectiveRange(a: PeriodLike): { start: string; end: string } {
  const start = a.startDate ?? a.createdAt.slice(0, 10);
  const end = a.endDate ?? addDays(start, 6);
  return { start, end };
}

/** 오늘(한국) 기준으로 진행 중인지 -- 오늘 탭 요약용. */
export function isCurrent(a: PeriodLike, today = kstDate()): boolean {
  const { start, end } = effectiveRange(a);
  return start <= today && today <= end;
}

/** 이번 주(월~일)와 겹치는지 -- 숙제 탭 메인용. */
export function isThisWeek(a: PeriodLike): boolean {
  const weekStart = kstWeekStart();
  const weekEnd = addDays(weekStart, 6);
  const { start, end } = effectiveRange(a);
  return start <= weekEnd && end >= weekStart;
}

/** 이번 주 다음에 시작하는 숙제. */
export function isUpcoming(a: PeriodLike): boolean {
  const weekEnd = addDays(kstWeekStart(), 6);
  return effectiveRange(a).start > weekEnd;
}

/** 이번 주 전에 끝난 숙제 -- "지난 숙제". */
export function isPast(a: PeriodLike): boolean {
  return effectiveRange(a).end < kstWeekStart();
}

/** 제목·안내·그룹·책 제목·작가에서 검색(공백으로 나눈 단어 전부 포함). */
export function matchesQuery(
  a: { title: string; description: string | null; groupName: string; books: { title: string; author?: string | null }[] },
  query: string
): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [a.title, a.description ?? "", a.groupName, ...a.books.flatMap((b) => [b.title, b.author ?? ""])]
    .join(" ")
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}
