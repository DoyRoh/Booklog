// "오늘"은 항상 한국 시간 기준. Vercel 서버는 UTC로 돌고 폰은 KST라,
// new Date().toISOString()으로 날짜를 뽑으면 한국 새벽 0~9시에 전날로
// 찍히는 문제가 있었다(실제로 겪음). epoch에 9시간을 더한 뒤 UTC 필드를
// 읽으면 어디서 돌든 한국 달력 날짜가 나온다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function shifted(offsetDays = 0): Date {
  return new Date(Date.now() + KST_OFFSET_MS - offsetDays * DAY_MS);
}

/** 한국 시간 기준 오늘(offsetDays일 전) — "YYYY-MM-DD". */
export function kstDate(offsetDays = 0): string {
  return shifted(offsetDays).toISOString().slice(0, 10);
}

/** 한국 시간 기준 이번 주 월요일 — "YYYY-MM-DD". */
export function kstWeekStart(): string {
  const d = shifted();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** 한국 시간 기준 이번 달(offsetMonths달 전) — "YYYY-MM". */
export function kstMonth(offsetMonths = 0): string {
  const d = shifted();
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - offsetMonths, 1));
  return m.toISOString().slice(0, 7);
}
