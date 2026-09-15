"use client";

import { useEffect, useRef, useState } from "react";
import { spinesPerRow } from "@/lib/shelf-visual";

// 책등 선반 컨테이너의 실제 폭을 재서 한 줄에 몇 권 세울지 돌려준다.
// 첫 렌더(서버·측정 전)는 가장 좁은 폰(360px, 카드 안 277px, 선반 px-2 18px)
// 기준 7권으로 시작해 레이아웃이 튀지 않게 하고, 마운트 후 ResizeObserver로
// 실제 폭에 맞춘다. rowPadding은 선반 줄 자체의 좌우 여백 합계(px).
export function useSpinesPerRow(rowPadding = 18) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [perRow, setPerRow] = useState(7);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setPerRow(spinesPerRow(el.clientWidth - rowPadding));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowPadding]);

  return { ref, perRow };
}
