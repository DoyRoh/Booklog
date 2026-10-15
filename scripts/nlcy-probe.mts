// 임시 검사 6: 새 엑셀 읽기를 실제 누리집에 돌려 본다.
const mod = await import("../lib/nlcy-scrape.ts");
const { scrapeNlcyCategory } = (mod.default ?? mod) as typeof import("../lib/nlcy-scrape.ts");
for (const key of ["infant", "lower", "upper", "teen", "theme"] as const) {
  const r = await scrapeNlcyCategory(key);
  const noIsbn = r.books.filter((b) => !b.isbn).length;
  console.log(`\n##### ${key}: ${r.books.length}권 · ISBN 없음 ${noIsbn} · 월 ${r.months.join(",")}`);
  for (const b of r.books) console.log(`  ${b.month} | ${b.title} | ${b.author} | ${b.publisher} | ${b.isbn} | ${b.theme ?? ""}`);
}
