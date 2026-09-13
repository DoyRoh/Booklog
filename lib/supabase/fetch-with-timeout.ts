// Supabase로 나가는 요청에 시간 제한을 건다. DB가 굳었을 때(무료 플랜에서
// 실제로 겪음) 서버 컴포넌트·미들웨어가 응답을 하염없이 기다려 폰에는 흰
// 화면만 몇 분씩 떠 있었다. 제한을 넘기면 supabase-js가 평범한 오류로
// 돌려주므로, 화면은 "불러오지 못했어요" 안내를 바로 그린다.
//
// 저장소(사진·음성 업로드)는 느린 회선에서 오래 걸릴 수 있어 제외한다.
export const DB_TIMEOUT_MESSAGE = "서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.";

export function fetchWithTimeout(ms: number): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/storage/v1/")) return fetch(input, init);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    // 호출자가 이미 signal을 넘겼으면 둘 중 먼저 오는 쪽으로 중단.
    init?.signal?.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (e) {
      if (controller.signal.aborted && !init?.signal?.aborted) {
        // 이름을 AbortError로 둬야 supabase-js가 "중단됨"으로 보고 재시도를
        // 안 한다(다른 이름이면 네트워크 오류로 보고 1·2·4초 간격으로 세 번
        // 더 시도해 8초가 39초가 됐다 -- 실제로 재현해서 확인).
        const err = new Error(DB_TIMEOUT_MESSAGE) as Error & { code?: string };
        err.name = "AbortError";
        err.code = "ABORT_ERR";
        throw err;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
}
