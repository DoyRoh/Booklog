"use client";

import { GridViewIcon, ListRowsIcon } from "@/components/icons/misc-icons";

/**
 * 전면(격자) / 목록 보기 전환 -- 책장 탭과 추천도서가 똑같이 쓴다.
 * 시안대로 배경·테두리 없이 아이콘 두 개만 두고, 켜진 쪽만 초록으로
 * 칠한다(드롭다운·알약 배경은 오히려 복잡해 보인다는 지적).
 * 책장의 "책등" 보기처럼 여기 없는 모드일 때는 둘 다 꺼진 상태로 보인다.
 */
export default function ViewToggle({
  mode,
  onChange,
  size = 20,
}: {
  mode: string;
  onChange: (mode: "cover" | "list") => void;
  size?: number;
}) {
  const tone = (on: boolean) => ({ color: on ? "var(--point)" : "var(--ink-2)", opacity: on ? 1 : 0.45 });
  return (
    <div className="flex flex-none items-center gap-3">
      <button type="button" onClick={() => onChange("cover")} aria-label="전면 보기" aria-pressed={mode === "cover"} className="flex-none">
        <GridViewIcon width={size} height={size} style={tone(mode === "cover")} />
      </button>
      <button type="button" onClick={() => onChange("list")} aria-label="목록 보기" aria-pressed={mode === "list"} className="flex-none">
        <ListRowsIcon width={size} height={size} style={tone(mode === "list")} />
      </button>
    </div>
  );
}
