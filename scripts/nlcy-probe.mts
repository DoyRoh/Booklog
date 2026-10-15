// 임시 검사 4: 엑셀 다운로드와 월 검색.
const B = "https://nlcy.go.kr/NLCY";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
for (const opt of ["2025-", "2026-", "2025-06"]) {
  const u = `${B}/board/C10600000000_suggestBookListExcel.do?schOpt2=${opt}&bcid=nlcy_normal08&schBdcode=_nlcy_normal0801`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0", Referer: `${B}/contents/C10600000000.do` } });
  const buf = Buffer.from(await r.arrayBuffer());
  console.log(`\nEXCEL ${opt} HTTP ${r.status} type=${r.headers.get("content-type")} disp=${r.headers.get("content-disposition")} len=${buf.length} magic=${buf.subarray(0, 4).toString("hex")}`);
  const text = buf.toString("utf8");
  console.log(text.replace(/\s+/g, " ").slice(0, 3000));
  await wait(1500);
}
const h = await (await fetch(`${B}/contents/C10600000000.do?schBdcode=_nlcy_normal0801&schOpt2=2025-06&ext2=1&schOpt3=search`, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
console.log("\nMONTH 2025-06 titles:", [...h.matchAll(/<p class="tit">([\s\S]*?)<\/p>/g)].map((m) => m[1].trim()).join(" / "));
console.log("months:", [...new Set([...h.matchAll(/\((\d{4}년 \d{1,2}월) 추천도서\)/g)].map((m) => m[1]))].join(","));
const p = h.search(/page=2|pageIndex|fn_link_page|goPage\(|paging/i);
console.log("PAGINGHINT", h.slice(Math.max(0, p - 300), p + 600).replace(/\s+/g, " "));
