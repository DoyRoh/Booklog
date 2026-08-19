"use client";

import { CalendarIcon } from "@/components/icons/record-icons";

function toDateStr(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
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
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="d flex items-center gap-1.5 text-sm">
        <CalendarIcon width={16} height={16} style={{ color: "var(--ink-2)" }} />
        언제 읽었어?
      </p>
      <div className="mt-2 flex gap-2">
        {QUICK_OPTIONS.map(({ label, days }) => {
          const optionDate = toDateStr(days);
          const active = value === optionDate;
          return (
            <button
              key={label}
              type="button"
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
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-[14px] border px-2 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />
      </div>
    </div>
  );
}
