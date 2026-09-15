import { headers } from "next/headers";

// proxy.ts가 모든 요청마다 이미 supabase.auth.getUser()로 네트워크 검증을
// 마친 사용자 id를 이 헤더에 실어 보낸다. 클라이언트가 같은 이름의 헤더를
// 직접 보내더라도 proxy.ts가 항상 먼저 지우고 검증된 값으로만 다시 채우기
// 때문에, 이 미들웨어를 반드시 거치는 서버 컴포넌트에서는 위조될 수 없다.
export const VERIFIED_USER_HEADER = "x-chaeksup-user-id";

/**
 * 페이지마다 supabase.auth.getUser()를 다시 불러 네트워크 왕복을 만드는
 * 대신, 미들웨어가 이미 검증해 헤더로 넘겨준 사용자 id를 읽는다. 탭 전환
 * 때마다 "미들웨어에서 한 번, 페이지에서 또 한 번" 검증하던 왕복 하나를
 * 통째로 없애는 게 목적이다.
 *
 * 헤더가 없으면(예: 이 함수를 직접 테스트하거나, matcher 밖의 요청) null을
 * 반환한다 -- 이 경우 호출부는 로그인 안 된 것으로 취급해도 안전하다.
 * proxy.ts의 matcher는 정적 자산을 제외한 모든 경로를 포함하므로, 실제
 * 앱 페이지 요청에서 이 값이 비어 있을 일은 없다.
 */
export async function getVerifiedUserId(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get(VERIFIED_USER_HEADER);
}
