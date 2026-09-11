/**
 * 아이들·추천도서·숙제 세 탭이 공유하는 "지금 보고 있는 그룹"을 정한다
 * (부모 쪽 active_child_id와 같은 패턴). 우선순위: URL의 `?group=`(다른
 * 화면에서 특정 그룹으로 들어온 경우, 예: 책 상세의 "← 추천도서") >
 * `users.active_operator_group_id`(그룹 선택 드롭다운이 저장해 둔 값,
 * 탭을 옮겨도 그대로 이어짐) > 첫 그룹.
 */
export function pickActiveGroupId(
  groups: { id: string }[],
  requestedId: string | undefined,
  storedId: string | null | undefined
): string | null {
  if (requestedId && groups.some((g) => g.id === requestedId)) return requestedId;
  if (storedId && groups.some((g) => g.id === storedId)) return storedId;
  return groups[0]?.id ?? null;
}
