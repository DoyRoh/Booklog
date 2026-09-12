"use client";

import { CalendarIcon } from "@/components/icons/record-icons";
import { kstDate } from "@/lib/kst";

function toDateStr(offsetDays: number) {
  return kstDate(offsetDays);
}

const QUICK_OPTIONS = [
  { label: "오늘", days: 0 },
  { label: "어제", days: 1 },
  { label: "그제", days: 2 },
] as const;

// 레거시의 "언제 읽었어?" 빠른 선택(오늘/어제/그제) + 직접 날짜 입력.
export default function ReadDatePicker({
  value,
  onChange,
  disabled,
  disabledHint,
}: {
  value: string;
  onChange: (value: string) => void;
  /** "읽고 싶어요"처럼 아직 읽지 않은 상태 -- 흐리게 두고 못 누르게 한다. */
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div style={disabled ? { opacity: 0.45 } : undefined}>
      <p className="d flex items-center gap-1.5 text-sm">
        <CalendarIcon width={16} height={16} style={{ color: "var(--ink-2)" }} />
        언제 읽었어?
        {disabled && disabledHint && (
          <span className="text-xs font-normal" style={{ color: "var(--ink-2)" }}>
            {disabledHint}
          </span>
        )}
      </p>
      {/* 오늘·어제·그제는 한 줄, 직접 고르는 날짜는 그 아래 한 줄 전체 --
          네 칸을 한 줄에 넣으면 iOS가 그리는 "2026. 9. 12."가 두 줄로 꺾인다. */}
      <div className="mt-2 flex gap-2">
        {QUICK_OPTIONS.map(({ label, days }) => {
          const optionDate = toDateStr(days);
          const active = value === optionDate;
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(optionDate)}
              className="d flex-1 rounded-[14px] border py-2.5 text-sm"
              style={{
                borderColor: active ? "var(--point)" : "var(--rule)",
                background: active ? "rgba(47,168,79,0.08)" : "var(--card)",
                color: active ? "var(--point-deep)" : "var(--ink)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full min-w-0 rounded-[14px] border px-3 py-2.5 text-sm outline-none"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      />
    </div>
  );
}
