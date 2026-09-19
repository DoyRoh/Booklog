// 나무 선반 책장의 생김새 -- 아이의 책장 탭(components/library-shelf.tsx),
// 그룹 추천도서 선반(components/recommend-shelf.tsx), 숲지기의 추천도서
// 전면·책등 보기가 함께 쓴다. 서버 컴포넌트에서도 안전하게 import할 수
// 있도록 "use client" 파일이 아니라 평범한 모듈로 둔다(예전에 상수를
// 클라이언트 파일에서 내보냈다가 서버에서 프록시 객체로 넘어와 레이아웃이
// 깨진 적이 있다).

// 책등 색상 -- 세이지그린 숲 컨셉과 어울리는 팔레트(이끼/나무껍질/등불/흙빛)에서
// 책 제목 해시로 고정 배정해, 같은 책은 항상 같은 색으로 보이게 한다.
export const SPINE_COLORS = ["#6B8F71", "#A6763F", "#D9A441", "#7C9C82", "#B5654A", "#5E7A6B", "#C9A66B"];

// 숲길 배경 그림의 나무 기둥 색(밝은 결 → 몸통 → 아래 그늘)을 그대로 뽑아
// 왔다. 나뭇결 무늬는 일부러 넣지 않는다(표지 이미지와 싸워서 산만해짐).
// 벽에 붙인 가는 선반 느낌 -- 위쪽 밝은 결 한 줄 + 앞면 몸통, 아래로 옅은 그림자.
export const PLANK_STYLE = {
  height: 5,
  background: "linear-gradient(#9C8A6B, #7A6247)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 2px 3px rgba(38,54,43,0.22), 0 6px 10px -6px rgba(38,54,43,0.25)",
  borderRadius: 2,
} as const;

function hashOf(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

// 책등 보기에서 책마다 높이를 조금씩 다르게 -- 전부 같은 높이면 막대그래프처럼
// 보인다. 제목 해시로 고정해서 같은 책은 항상 같은 높이.
export function spineHeight(title: string) {
  return 124 + (hashOf(title) % 5) * 9; // 124 ~ 160px
}

export function spineColor(title: string) {
  return SPINE_COLORS[hashOf(title) % SPINE_COLORS.length];
}

// 책등 바탕은 제목 해시로 고른 팔레트 단색(spineColor)만 쓴다. 표지 이미지를
// 띠로 잘라 붙이는 방식(가운데 띠·어두운 막·블러까지)을 시도했지만 실제
// 표지 위에 얹은 흰 제목의 가독성이 떨어져 사용자 결정으로 되돌렸다.

// 책등 한 권의 폭과 사이 간격(px). 한 줄에 몇 권 세울지는 고정 권수가 아니라
// 실제 선반 폭을 재서 정한다(components/use-spines-per-row.ts) -- 예전엔 7권
// 고정이라 넓은 폰에서 오른쪽이 비었다.
export const SPINE_WIDTH = 32;
export const SPINE_GAP = 4.5; // gap-1 = 0.25rem, 루트 글자 크기 112.5% 기준

export function spinesPerRow(rowInnerWidth: number) {
  return Math.max(1, Math.floor((rowInnerWidth + SPINE_GAP) / (SPINE_WIDTH + SPINE_GAP)));
}

// 표지 선반 한 줄 권수. 폰(카드 안 폭 ~280~400px)은 3권, 아이패드처럼 넓어지면
// 표지 한 장이 130px 안팎을 넘지 않는 선에서 4~5권. 아이패드 세로(본문 760px,
// 카드 안 ~690px)에서 5권 = 표지 약 120px.
export function coversPerRow(rowInnerWidth: number) {
  if (rowInnerWidth >= 560) return 5;
  if (rowInnerWidth >= 440) return 4;
  return 3;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}
