/**
 * 숲길·숙제 탭이 공유하는 "지금 보고 있는 그룹"을 정한다(숲지기 쪽
 * pickActiveGroupId와 같은 패턴). 우선순위: URL의 `?group=`(다른 화면에서
 * 특정 그룹으로 들어온 경우) > `children.active_group_id`(그룹 전환 바가
 * 저장해 둔 값, 탭을 옮겨도 그대로 이어짐) > "all"(전체 보기, 부모 쪽은
 * 숲지기와 달리 "모든 그룹을 합쳐 보기"가 기본값이라 첫 그룹이 아니라
 * "all"로 떨어진다).
 */
export function pickActiveChildGroupId(
  groups: { id: string }[],
  requestedId: string | undefined,
  storedId: string | null | undefined
): string {
  if (requestedId && groups.some((g) => g.id === requestedId)) return requestedId;
  if (storedId && groups.some((g) => g.id === storedId)) return storedId;
  return "all";
}
