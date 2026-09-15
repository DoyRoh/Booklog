"use client";

import { GridViewIcon, ListRowsIcon, SpineBarsIcon } from "@/components/icons/misc-icons";

type ToggleMode = "cover" | "spine" | "list";

const ICONS: Record<ToggleMode, { Icon: typeof GridViewIcon; label: string }> = {
  cover: { Icon: GridViewIcon, label: "전면 보기" },
  spine: { Icon: SpineBarsIcon, label: "책등 보기" },
  list: { Icon: ListRowsIcon, label: "목록 보기" },
};

/**
 * 보기 전환 -- 책장 탭(전면·책등·목록)과 추천도서(전면·목록)가 똑같이 쓴다.
 * 시안대로 배경·테두리 없이 채움 아이콘만 두고, 켜진 쪽만 초록으로 칠한다
 * (드롭다운·알약 배경·⋯ 메뉴는 오히려 복잡해 보인다는 지적).
 */
export default function ViewToggle({
  mode,
  onChange,
  modes = ["cover", "list"],
  size = 20,
}: {
  mode: string;
  onChange: (mode: ToggleMode) => void;
  modes?: ToggleMode[];
  size?: number;
}) {
  return (
    <div className="flex flex-none items-center gap-3">
      {modes.map((value) => {
        const { Icon, label } = ICONS[value];
        const on = mode === value;
        return (
          <button key={value} type="button" onClick={() => onChange(value)} aria-label={label} aria-pressed={on} className="flex-none">
            <Icon width={size} height={size} style={{ color: on ? "var(--point)" : "var(--ink-2)", opacity: on ? 1 : 0.45 }} />
          </button>
        );
      })}
    </div>
  );
}
