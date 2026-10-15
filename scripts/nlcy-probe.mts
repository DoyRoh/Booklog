// 임시 검사 2: 실제 구조(카테고리 함수·연월 폼·책 목록 마크업)를 뽑는다.
const BASE = "https://nlcy.go.kr/NLCY/contents/C10600000000.do";
const get = async (u: string) => {
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  return { status: r.status, html: await r.text() };
};
const sq = (s: string) => s.replace(/\s+/g, " ");
const { html } = await get(`${BASE}?schBdcode=_nlcy_normal0802&page=1`);
for (const name of ["fn_goCategoryList", "fn_search", "fn_link", "fn_view", "goPage", "fn_egov_link_page", "linkPage"]) {
  const i = html.indexOf(`function ${name}`);
  if (i >= 0) console.log(`FUNC ${name}:`, sq(html.slice(i, i + 900)));
}
const fi = html.indexOf('name="recYear"');
const formStart = html.lastIndexOf("<form", fi);
console.log("FORM:", sq(html.slice(formStart, formStart + 2500)));
const ri = html.indexOf('id="recMonth"');
console.log("\nAFTER_MONTH:", sq(html.slice(ri, ri + 9000)));
console.log("\nVIEWLINKS:", [...html.matchAll(/<a\b[^>]*(schM=view|fn_view|goView|Detail|detail)[^>]*>/gi)].slice(0, 10).map((m) => sq(m[0])).join("\n"));

for (const u of [
  `${BASE}?schBdcode=_nlcy_normal0801&recYear=2026&recMonth=&page=1`,
  `${BASE}?schBdcode=_nlcy_normal0801&recYear=2025&recMonth=&page=2`,
  `${BASE}?schM=list&schBdcode=_nlcy_normal0801&recYear=2025&recMonth=06&page=1`,
]) {
  const r = await get(u);
  const i = r.html.indexOf('id="recMonth"');
  const tot = /총\s*<[^>]*>?\s*[\d,]+|전체\s*[\d,]+\s*건|total[^<]{0,40}/i.exec(r.html)?.[0];
  console.log(`\n===== ${u} HTTP ${r.status} len=${r.html.length} total=${tot}`);
  console.log(sq(r.html.slice(i + 600, i + 6000)));
}
