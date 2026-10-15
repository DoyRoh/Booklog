// 도서관 정보나루(data4library.kr) 오픈 API — 서버 전용(LIBRARY_API_KEY).
// 응답은 { response: { libs: [{ lib: {...} }] } } / { response: { result: {...} } } 모양.
const BASE = "http://data4library.kr/api";

import { REGIONS } from "./library-regions";

export { REGIONS };

export type LibraryInfo = { code: string; name: string; address: string };

async function call(path: string, params: Record<string, string>, revalidate: number) {
  const key = process.env.LIBRARY_API_KEY;
  if (!key) throw new Error("LIBRARY_API_KEY가 설정되지 않았어요.");
  const qs = new URLSearchParams({ authKey: key, format: "json", ...params });
  const res = await fetch(`${BASE}/${path}?${qs}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`도서관 정보나루 응답 오류 (${res.status})`);
  const json = (await res.json()) as { response?: Record<string, unknown> };
  const response = json.response ?? {};
  if (typeof response.error === "string") throw new Error(response.error);
  return response;
}

/** 시/도 안의 공공도서관 목록(하루 캐시). */
export async function listLibraries(region: string): Promise<LibraryInfo[]> {
  const response = await call("libSrch", { region, pageNo: "1", pageSize: "1000" }, 86400);
  const libs = (response.libs as { lib?: Record<string, string> }[] | undefined) ?? [];
  return libs
    .map(({ lib }) => ({
      code: String(lib?.libCode ?? ""),
      name: String(lib?.libName ?? ""),
      address: String(lib?.address ?? ""),
    }))
    .filter((lib) => lib.code && lib.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/**
 * 이름·동네로 전국에서 찾기 — 지역을 몰라도 도서관 이름만 알면 고를 수 있게.
 * 시/도별 목록(각각 하루 캐시)을 한꺼번에 불러 이름·주소에 모든 단어가 들어간 곳만.
 * 한 지역이 실패해도 나머지 결과는 돌려준다.
 */
export async function searchLibraries(query: string, limit = 40): Promise<(LibraryInfo & { region: string })[]> {
  const words = query.trim().split(/\s+/).filter(Boolean).map((w) => w.toLowerCase());
  if (words.length === 0) return [];
  const all = await Promise.all(
    REGIONS.map(async (r) => (await listLibraries(r.code).catch(() => [])).map((lib) => ({ ...lib, region: r.code })))
  );
  const hay = (l: LibraryInfo) => (l.name + " " + l.address).toLowerCase().replace(/\s+/g, "");
  return all
    .flat()
    .filter((l) => words.every((w) => hay(l).includes(w)))
    // 이름에 걸린 곳을 주소에만 걸린 곳보다 앞으로.
    .sort((a, b) => {
      const an = words.every((w) => a.name.toLowerCase().includes(w)) ? 0 : 1;
      const bn = words.every((w) => b.name.toLowerCase().includes(w)) ? 0 : 1;
      return an - bn || a.name.localeCompare(b.name, "ko");
    })
    .slice(0, limit);
}

export type Availability = { code: string; hasBook: boolean; loanAvailable: boolean } | { code: string; error: true };

/** 한 도서관의 소장·대출 가능 여부(1시간 캐시 — 정보나루 자료 자체가 하루 단위로 갱신됨). */
export async function bookExist(libCode: string, isbn13: string): Promise<Availability> {
  try {
    const response = await call("bookExist", { libCode, isbn13 }, 3600);
    const result = (response.result ?? {}) as Record<string, string>;
    return { code: libCode, hasBook: result.hasBook === "Y", loanAvailable: result.loanAvailable === "Y" };
  } catch {
    return { code: libCode, error: true };
  }
}

/** 한 지역에서 이 책을 가진 도서관 목록(1시간 캐시). */
export async function librariesHolding(isbn13: string, region: string): Promise<LibraryInfo[]> {
  const response = await call("libSrchByBook", { isbn: isbn13, region, pageNo: "1", pageSize: "50" }, 3600);
  const libs = (response.libs as { lib?: Record<string, string> }[] | undefined) ?? [];
  return libs
    .map(({ lib }) => ({
      code: String(lib?.libCode ?? ""),
      name: String(lib?.libName ?? ""),
      address: String(lib?.address ?? ""),
    }))
    .filter((lib) => lib.code && lib.name);
}
