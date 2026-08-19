"use client";

import { Star5Icon, GrinIcon, SmileIcon, MehIcon, DizzyIcon } from "@/components/icons/record-icons";

// 레거시 "유안이 독서기록"의 평점 스티커(최고/재밌어/좋아/보통/별로)를
// 그대로 옮겨왔다 -- 숫자 원형 버튼보다 아이가 읽고 고르기 쉽다.
const RATINGS = [
  { v: 5, l: "최고", Icon: Star5Icon, col: "var(--c-red)" },
  { v: 4, l: "재밌어", Icon: GrinIcon, col: "var(--c-yellow)" },
  { v: 3, l: "좋아", Icon: SmileIcon, col: "var(--c-green)" },
  { v: 2, l: "보통", Icon: MehIcon, col: "var(--c-blue)" },
  { v: 1, l: "별로", Icon: DizzyIcon, col: "var(--c-pink)" },
] as const;

export default function RatingPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {RATINGS.map(({ v, l, Icon, col }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(active ? null : v)}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border py-2.5"
            style={{
              borderColor: active ? "var(--point)" : "var(--rule)",
              background: active ? "rgba(47,168,79,0.06)" : "var(--card)",
            }}
          >
            <span
              className="flex items-center justify-center text-white"
              style={{
                width: 34,
                height: 34,
                background: col,
                borderRadius: "38% 62% 68% 32% / 58% 42% 58% 42%",
                opacity: active ? 1 : 0.55,
              }}
            >
              <Icon width={18} height={18} />
            </span>
            <span className="d text-xs" style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}>
              {l}
            </span>
          </button>
        );
      })}
    </div>
  );
}
