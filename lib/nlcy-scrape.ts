// 국립어린이청소년도서관 누리집 "사서추천도서"를 분류별로 읽어 온다(서버 전용).
//
// 예전 Open API(lib/nlcy-sync.ts)는 분류 없이 섞여 와서 쓸모가 없었다. 누리집 목록
// 화면은 분류마다 10권씩만 보여 주고 쪽 넘기기가 자바스크립트라 HTML로는 다 못 읽지만,
// 같은 화면의 "목록다운로드(엑셀)" 주소는 분류(schBdcode) + 연도(schOpt2=YYYY-)로
// 그 해 목록 전체를 xlsx로 준다(2026-10 GitHub Actions에서 실제로 받아 확인):
//   번호 | 추천연월 | 테마 | 대상 | 책제목 | 주제구분 | 지은이 | 발행사 | 발행년도 | ISBN | 청구기호 | 가격
// 그래서 분류마다 작년·올해 두 파일만 받아 읽는다.

import { inflateRawSync } from "node:zlib";
import { NLCY_CATEGORIES, type NlcyCategoryKey } from "@/lib/nlcy-categories";
export { NLCY_CATEGORIES, type NlcyCategoryKey };

export const NLCY_OPERATOR_NAME = "국립어린이청소년도서관";
const EXCEL_URL = "https://nlcy.go.kr/NLCY/board/C10600000000_suggestBookListExcel.do";
// 작년 + 올해(한국 날짜). 해가 바뀌어도 자동 실행이 계속 따라간다.
function targetYears() {
  const y = new Date(Date.now() + 9 * 3600_000).getUTCFullYear();
  return [String(y - 1), String(y)];
}

export type NlcyBook = {
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  month: string;
  theme: string | null;
  target: string | null;
};
export type NlcyScrapeResult = {
  months: string[];
  books: NlcyBook[];
  debug: { pagesFetched: number; note?: string };
};

// ---- 아주 작은 xlsx 읽기(zip 중앙 디렉터리 → sharedStrings + sheet1) ----
function unzip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("엑셀 파일을 읽지 못했어요.");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (t: string) =>
  t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, c: string) =>
    c[0] === "#" ? String.fromCodePoint(c[1].toLowerCase() === "x" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : ENTITIES[c] ?? m
  );
const textOf = (xml: string) => decode([...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

function readSheet(buf: Buffer): Record<string, string>[] {
  const files = unzip(buf);
  const shared = [...(files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    textOf(m[1])
  );
  const sheetName = [...files.keys()].find((k) => /^xl\/worksheets\/sheet\d*\.xml$/.test(k));
  const sheet = sheetName ? files.get(sheetName)!.toString("utf8") : "";
  const rows = [...sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
    const cells: Record<string, string> = {};
    for (const c of r[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = /r="([A-Z]+)/.exec(c[1])?.[1];
      if (!col) continue;
      const body = c[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      cells[col] = /t="s"/.test(c[1]) ? shared[Number(v)] ?? "" : v !== undefined ? decode(v) : textOf(body);
    }
    return cells;
  });
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(Object.entries(header).map(([col, name]) => [name.trim(), (r[col] ?? "").trim()])));
}

async function fetchYear(code: string, year: string): Promise<Record<string, string>[]> {
  const u = new URL(EXCEL_URL);
  u.searchParams.set("schOpt2", `${year}-`);
  u.searchParams.set("bcid", "nlcy_normal08");
  u.searchParams.set("schBdcode", code);
  const res = await fetch(u, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ChaeksupBot/1.0; +https://booklog-13xh.vercel.app/support)",
      Referer: "https://nlcy.go.kr/NLCY/contents/C10600000000.do",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`도서관 누리집 요청이 실패했어요 (HTTP ${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("도서관 누리집이 엑셀 대신 다른 응답을 줬어요.");
  return readSheet(buf);
}

export async function scrapeNlcyCategory(key: NlcyCategoryKey): Promise<NlcyScrapeResult> {
  const category = NLCY_CATEGORIES.find((c) => c.key === key)!;
  const years = targetYears();
  const perYear = await Promise.all(years.map((y) => fetchYear(category.code, y)));
  const seen = new Set<string>();
  const books: NlcyBook[] = [];
  for (const row of perYear.flat()) {
    const title = row["책제목"];
    if (!title) continue;
    const isbn = (row["ISBN"] ?? "").split(/\s+/).find((v) => /^97[89]\d{10}$/.test(v)) ?? null;
    const k = isbn ?? title.replace(/\s/g, "");
    if (seen.has(k)) continue;
    seen.add(k);
    books.push({
      title,
      author: row["지은이"] || null,
      publisher: row["발행사"] || null,
      isbn,
      month: row["추천연월"] ?? "",
      theme: row["테마"] || null,
      target: row["대상"] || null,
    });
  }
  books.sort((a, b) => b.month.localeCompare(a.month));
  return {
    months: [...new Set(books.map((b) => b.month))].sort(),
    books,
    debug: { pagesFetched: years.length },
  };
}
