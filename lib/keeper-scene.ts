// 숲지기(그룹) 수 -> 우리 숲의 곰·새 개수. group1("첫 숲지기", 그룹 1곳)·
// group3("숲지기 셋", 그룹 3곳) 배지와 같은 문턱값(>=1, >=3)을 쓴다 -- 그룹을
// 하나 더 들어가도 문턱을 안 넘으면 그림이 그대로라, "그룹이 늘 때마다
// 곰·새가 계속 늘어서 헷갈린다"는 문제가 생기지 않는다. 오늘 탭 미리보기
// (forest-strip.tsx)와 우리 숲 전체 화면(forest-view.tsx)이 이 함수들을
// 공유해서 같은 그림을 그린다.
export function keeperBearCount(groupCount: number): number {
  if (groupCount >= 3) return 3;
  if (groupCount >= 1) return 1;
  return 0;
}

export function keeperBirdCount(groupCount: number): number {
  let count = 0;
  if (groupCount >= 1) count++;
  if (groupCount >= 3) count++;
  return count;
}
