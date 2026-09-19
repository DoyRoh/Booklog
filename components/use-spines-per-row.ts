"use client";

import { useEffect, useState } from "react";
import { coversPerRow, spinesPerRow } from "@/lib/shelf-visual";

// 선반 컨테이너의 실제 폭을 재서 한 줄에 몇 권 놓을지 돌려준다.
// ref는 콜백 ref라, 선반이 나중에 마운트되어도(보기 방식을 바꾼 뒤) 그때 측정이
// 시작된다 -- 예전 useRef 방식은 첫 마운트 때 선반이 없으면 영영 기본값에 머물렀다.
// 첫 렌더(서버·측정 전)는 폰 기준 기본값으로 시작해 레이아웃이 튀지 않게 한다.
function useMeasuredPerRow(compute: (innerWidth: number) => number, fallback: number, padding: number) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [perRow, setPerRow] = useState(fallback);

  useEffect(() => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setPerRow(compute(el.clientWidth - padding));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, compute, padding]);

  return { ref: setEl, perRow };
}

// 책등: 가장 좁은 폰(360px, 카드 안 277px, 선반 px-2 18px) 기준 7권으로 시작.
// rowPadding은 선반 줄 자체의 좌우 여백 합계(px).
export function useSpinesPerRow(rowPadding = 18) {
  return useMeasuredPerRow(spinesPerRow, 7, rowPadding);
}

// 표지: 폰에서는 3권, 아이패드처럼 넓으면 4~5권(lib/shelf-visual.ts의 coversPerRow).
// rowPadding은 표지 줄의 좌우 여백 합계(px-3 = 27px).
export function useCoversPerRow(rowPadding = 27) {
  return useMeasuredPerRow(coversPerRow, 3, rowPadding);
}
