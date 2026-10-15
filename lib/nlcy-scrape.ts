// 국립어린이청소년도서관 누리집 "사서추천도서" 목록을 분류별로 읽어 온다(서버 전용).
//
// 예전 Open API(lib/nlcy-sync.ts)는 분류 없이 섞여 와서 쓸모가 없었고, 누리집은
// 유아/초등저학년/초등고학년/청소년/테마 탭과 월(YYYY-MM)로 나뉘어 있다.
// 개발 환경에서는 누리집에 접속이 막혀 실제 HTML 구조를 확인하지 못했기 때문에
// 특정 클래스 이름에 기대지 않고 링크를 따라가는 방식으로 짰다:
//   1) 시작 페이지에서 글자가 분류 이름인 링크(탭)를 찾고
//   2) 그 탭 페이지에서 2025-MM / 2026-MM 값을 모두 모아(월 선택 상자·링크)
//   3) 월마다 목록 페이지를 열어 "schM=view"(상세 보기)로 가는 링크를 책으로 본다.
// 하나라도 못 찾으면 화면에 찾은 링크 목록(debug)을 그대로 돌려줘서 고칠 수 있게 한다.

export const NLCY_START_URL =
  "https://nlcy.go.kr/NLCY/contents/C10600000000.do?schBdcode=_nlcy_normal0802&page=1";
export const NLCY_OPERATOR_NAME = "국립어린이청소년도서관";
const YEARS = ["2025", "2026"];
const MAX_PAGES_PER_MONTH = 6;

import { NLCY_CATEGORIES, type NlcyCategoryKey } from "@/lib/nlcy-categories";
export { NLCY_CATEGORIES, type NlcyCategoryKey };

export type NlcyBook = { title: string; author: string | null; month: string; href: string };
export type NlcyLink = { text: string; href: string };
export type NlcyScrapeResult = {
  tabUrl: string | null;
  months: string[];
  books: NlcyBook[];
  /** 문제를 찾을 때 쓰는 정보 -- 탭/책을 못 찾았을 때 화면에 보여 준다. */
  debug: { startLinks?: NlcyLink[]; tabLinks?: NlcyLink[]; pagesFetched: number; note?: string };
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·" };
function decodeEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}
const stripTags = (html: string) =>
  decodeEntities(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
const compact = (text: string) => text.replace(/\s/g, "");

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ChaeksupBot/1.0; +https://booklog-13xh.vercel.app/support)",
      Accept: "text/html",
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`도서관 누리집 요청이 실패했어요 (HTTP ${res.status}).`);
  const buf = await res.arrayBuffer();
  const charset = /charset=([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1]?.toLowerCase();
  const head = new TextDecoder("utf-8").decode(buf.slice(0, 2048));
  const metaCharset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1]?.toLowerCase();
  const enc = charset ?? metaCharset ?? "utf-8";
  return new TextDecoder(enc === "ms949" || enc === "cp949" ? "euc-kr" : enc).decode(buf);
}

type Anchor = { href: string; text: string; inner: string; attrs: string };
function anchors(html: string, baseUrl: string): Anchor[] {
  const out: Anchor[] = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const attrs = m[1];
    const raw = /href\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
    let href = "";
    const decoded = decodeEntities(raw).trim();
    if (decoded && !/^(javascript:|#)/i.test(decoded)) {
      try {
        href = new URL(decoded, baseUrl).toString();
      } catch {
        href = "";
      }
    }
    out.push({ href, text: stripTags(m[2]), inner: m[2], attrs });
  }
  return out;
}

function isTabFor(text: string, tab: string) {
  const t = compact(text);
  return t === tab || (t.startsWith(tab) && t.length <= tab.length + 4);
}

function findMonths(html: string): string[] {
  const set = new Set<string>();
  const re = /(20\d{2})[-.](0[1-9]|1[0-2])/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (YEARS.includes(m[1])) set.add(`${m[1]}-${m[2]}`);
  }
  return [...set].sort();
}

function allMonthsUntilNow(): string[] {
  const now = new Date(Date.now() + 9 * 3600_000);
  const out: string[] = [];
  for (const y of YEARS) {
    for (let mo = 1; mo <= 12; mo++) {
      const ym = `${y}-${String(mo).padStart(2, "0")}`;
      if (Number(y) > now.getUTCFullYear() || (Number(y) === now.getUTCFullYear() && mo > now.getUTCMonth() + 1)) break;
      out.push(ym);
    }
  }
  return out;
}

function listUrl(tabUrl: string, month: string, page: number) {
  const u = new URL(tabUrl);
  u.searchParams.set("schM", "list");
  if (!u.searchParams.get("schBcid")) u.searchParams.set("schBcid", "nlcy_normal08");
  u.searchParams.set("schOpt2", month);
  u.searchParams.set("schOpt3", "search");
  u.searchParams.set("page", String(page));
  u.searchParams.delete("id");
  return u.toString();
}

// 상세 링크 하나에서 제목(과 있으면 저자)을 뽑는다.
function bookFromAnchor(a: Anchor): { title: string; author: string | null } | null {
  const classed = (re: RegExp) => {
    const m = new RegExp(`<[^>]+class=["'][^"']*(?:${re.source})[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, "i").exec(a.inner);
    return m ? stripTags(m[1]) : "";
  };
  const alt = /<img[^>]+alt=["']([^"']+)["']/i.exec(a.inner)?.[1];
  let title = classed(/tit|subject|title|name/) || a.text || (alt ? decodeEntities(alt) : "");
  let author = classed(/writer|author|auth|creator/) || null;
  title = title
    .replace(/^\[[^\]]*\]\s*/, "")
    .replace(/\b(new|NEW)\b|새글/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // "제목 / 저자" · "제목 | 저자" 꼴이면 나눈다.
  const split = title.split(/\s+[/|]\s+/);
  if (split.length >= 2) {
    title = split[0].trim();
    author = author || split[1].trim();
  }
  if (title.length < 1 || title.length > 80) return null;
  if (/^(상세|자세히|보기|더보기|목록)$/.test(compact(title))) return null;
  return { title, author: author?.replace(/^(저자|지은이|글)\s*[:：]?\s*/, "").trim() || null };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let idx = i++; idx < items.length; idx = i++) out[idx] = await fn(items[idx]);
    })
  );
  return out;
}

export async function scrapeNlcyCategory(key: NlcyCategoryKey): Promise<NlcyScrapeResult> {
  const category = NLCY_CATEGORIES.find((c) => c.key === key)!;
  let pagesFetched = 0;

  const startHtml = await fetchHtml(NLCY_START_URL);
  pagesFetched++;
  const startAnchors = anchors(startHtml, NLCY_START_URL);
  const tab = startAnchors.find((a) => a.href && isTabFor(a.text, category.tab));
  const linkDump = (list: Anchor[]) =>
    list.filter((a) => a.text).slice(0, 120).map((a) => ({ text: a.text.slice(0, 40), href: a.href || a.attrs.slice(0, 120) }));

  if (!tab) {
    return {
      tabUrl: null,
      months: [],
      books: [],
      debug: { startLinks: linkDump(startAnchors), pagesFetched, note: `"${category.tab}" 탭 링크를 못 찾았어요.` },
    };
  }

  const tabHtml = await fetchHtml(tab.href);
  pagesFetched++;
  let months = findMonths(tabHtml);
  const guessedMonths = months.length === 0;
  if (guessedMonths) months = allMonthsUntilNow();

  const seen = new Set<string>();
  const books: NlcyBook[] = [];
  const perMonth = await mapLimit(months, 4, async (month) => {
    const found: NlcyBook[] = [];
    const hrefs = new Set<string>();
    for (let page = 1; page <= MAX_PAGES_PER_MONTH; page++) {
      const url = listUrl(tab.href, month, page);
      let html: string;
      try {
        html = await fetchHtml(url);
      } catch {
        break;
      }
      pagesFetched++;
      const viewLinks = anchors(html, url).filter((a) => /schM=view/i.test(a.href));
      let fresh = 0;
      for (const a of viewLinks) {
        const id = new URL(a.href).searchParams.get("id") ?? a.href;
        if (hrefs.has(id)) continue;
        hrefs.add(id);
        const book = bookFromAnchor(a);
        if (!book) continue;
        fresh++;
        found.push({ ...book, month, href: a.href });
      }
      if (fresh === 0) break;
    }
    return found;
  });

  // 같은 목록이 월마다 반복되면(월 필터가 안 먹는 경우) 제목으로 한 번만.
  for (const list of perMonth) {
    for (const b of list) {
      const k = compact(b.title).toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      books.push(b);
    }
  }

  return {
    tabUrl: tab.href,
    months,
    books,
    debug: {
      tabLinks: books.length === 0 ? linkDump(anchors(tabHtml, tab.href)) : undefined,
      pagesFetched,
      note: guessedMonths ? "탭 페이지에서 2025·2026년 월을 못 찾아 1월부터 이번 달까지 모두 열어 봤어요." : undefined,
    },
  };
}
