"use client";

import { AGE_BANDS, AGE_BAND_HINTS, AGE_BAND_LABELS, type AgeBand } from "@/lib/age-bands";

/** 추천 연령 칩 -- 여러 개 고를 수 있고, 아무것도 안 고르면 "연령 미정". */
export default function AgeBandPicker({
  value,
  onChange,
}: {
  value: AgeBand[];
  onChange: (next: AgeBand[]) => void;
}) {
  function toggle(band: AgeBand) {
    const next = value.includes(band) ? value.filter((b) => b !== band) : [...value, band];
    onChange(AGE_BANDS.filter((b) => next.includes(b)));
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {AGE_BANDS.map((band) => {
        const on = value.includes(band);
        return (
          <button
            key={band}
            type="button"
            onClick={() => toggle(band)}
            aria-pressed={on}
            className="d flex flex-col items-center rounded-[12px] border px-3 py-1 text-xs leading-tight"
            style={{
              borderColor: on ? "var(--point)" : "var(--rule)",
              background: on ? "rgba(47,168,79,0.08)" : "transparent",
              color: on ? "var(--point-deep)" : "var(--ink-2)",
            }}
          >
            {AGE_BAND_LABELS[band]}
            <span className="text-[10px]" style={{ opacity: 0.7 }}>
              {AGE_BAND_HINTS[band]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
