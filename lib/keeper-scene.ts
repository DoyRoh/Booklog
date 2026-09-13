import type { IllustrationName } from "@/components/illustration";
import type { OperatorAvatar } from "@/lib/active-profile";

// 숲길 끝에 서는 숲지기 캐릭터 -- 예전엔 그룹 수와 무관하게 항상 곰
// 하나였는데, 이제 "그룹마다 한 마리, 그 그룹이 실제로 고른 얼굴(곰/백로)로"
// 보여준다(사용자 요청). 서로 다른 그룹은 서로 다른 얼굴로 보이므로,
// 예전에 "곰이 자꾸 늘어서 헷갈린다"던 문제(단일 종류만 계속 겹쳐 보임)가
// 재발하지 않는다 -- 그룹마다 구별되는 캐릭터가 곧 그 그룹임을 보여준다.
export const KEEPER_MAX = 4;

export function keeperIllustration(avatar: OperatorAvatar | null | undefined): IllustrationName {
  return avatar === "egret" ? "bird-perched" : "bear-lantern";
}
