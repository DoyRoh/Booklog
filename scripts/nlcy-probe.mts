// 임시 검사 3: 쪽 넘기기·월 필터 동작.
const BASE = "https://nlcy.go.kr/NLCY/contents/C10600000000.do";
const get = async (u: string) => (await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
const sq = (s: string) => s.replace(/\s+/g, " ");
const items = (h: string) =>
  [...h.matchAll(/<p class="tit">([\s\S]*?)<\/p>/g)].map((m, i) => {
    const month = [...h.matchAll(/\((\d{4})년 (\d{1,2})월 추천도서\)/g)][i * 2]?.slice(1).join("-");
    return `${month}|${m[1].trim().slice(0, 30)}`;
  });
const h = await get(`${BASE}?schBdcode=_nlcy_normal0801&page=1`);
const i = h.indexOf("function fn_search");
console.log("FN_SEARCH", sq(h.slice(i, i + 2500)));
const p = h.search(/class="[^"]*paging|class="[^"]*pagination|board_paging/);
console.log("PAGING", sq(h.slice(p - 200, p + 2500)));
for (const q of ["", "&schOpt2=2025-06", "&schOpt2=2025-06&recYear=2025&recMonth=06", "&schOpt2=-"]) {
  for (let page = 1; page <= 30; page++) {
    const its = items(await get(`${BASE}?schBdcode=_nlcy_normal0801${q}&page=${page}`));
    console.log(`Q[${q}] p${page} n=${its.length} ${its.slice(0, 3).join(" / ")} ... ${its.slice(-1)}`);
    if (its.length === 0) break;
    if (q !== "" && page > 3) break;
  }
}
