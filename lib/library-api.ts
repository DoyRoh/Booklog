// 도서관 정보나루(data4library.kr) 오픈 API — 서버 전용(LIBRARY_API_KEY).
// 응답은 { response: { libs: [{ lib: {...} }] } } / { response: { result: {...} } } 모양.
const BASE = "http://data4library.kr/api";

export { REGIONS } from "./library-regions";

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
