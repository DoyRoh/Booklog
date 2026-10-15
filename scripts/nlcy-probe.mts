// 임시 검사: GitHub Actions에서 국립어린이청소년도서관 누리집을 실제로 읽어 본다.
import { scrapeNlcyCategory, NLCY_START_URL } from "../lib/nlcy-scrape.ts";

async function dump(url: string, label: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  console.log(`\n===== ${label} HTTP ${res.status} len=${html.length} ${url}`);
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    attrs: m[1].replace(/\s+/g, " ").slice(0, 200),
    text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60),
  }));
  for (const a of anchors.filter((a) => /유아|초등|청소년|테마|schM|view|bdcode|Bdcode|onclick/i.test(a.text + a.attrs)).slice(0, 80)) {
    console.log("A |", a.text, "|", a.attrs);
  }
  const months = [...new Set([...html.matchAll(/20(25|26)[-.]\d{2}/g)].map((m) => m[0]))];
  console.log("MONTHS", months.join(","));
  for (const m of html.matchAll(/<select[\s\S]*?<\/select>/gi)) console.log("SELECT", m[0].replace(/\s+/g, " ").slice(0, 1500));
  const i = html.search(/board_list|bbs_list|book_list|list_wrap|<ul class="[^"]*list/i);
  console.log("LISTSNIP", html.slice(Math.max(0, i), i + 4000).replace(/\s+/g, " "));
  return html;
}

const start = await dump(NLCY_START_URL, "START");
for (const key of ["infant", "lower", "upper", "teen", "theme"] as const) {
  try {
    const r = await scrapeNlcyCategory(key);
    console.log(`\n##### ${key}: tab=${r.tabUrl} months=${r.months.join(",")} books=${r.books.length} pages=${r.debug.pagesFetched} note=${r.debug.note ?? ""}`);
    for (const b of r.books.slice(0, 15)) console.log("  BOOK", b.month, "|", b.title, "|", b.author, "|", b.href);
    if (r.books.length === 0) {
      for (const l of (r.debug.startLinks ?? r.debug.tabLinks ?? []).slice(0, 60)) console.log("  LINK", l.text, "|", l.href);
      if (r.tabUrl) await dump(r.tabUrl, `TAB ${key}`);
    }
  } catch (e) {
    console.log(`##### ${key} ERROR`, (e as Error).message);
  }
}
void start;
