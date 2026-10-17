"use client";

import { useState, type ReactNode } from "react";

// "내 그룹"은 늘어날 수 있어서 기본은 접어 두고, 펴면 높이를 제한해 안에서 스크롤한다.
export default function MyGroupsFold({ count, title = "내 그룹", className = "", children }: { count: number; title?: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`overflow-hidden rounded-[var(--r)] border ${className}`} style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-[24px] py-[16px] text-left"
      >
        <span className="d text-[18px] font-semibold leading-[24px]">
          {title} <span className="text-[15px]" style={{ color: "var(--ink-2)" }}>{count}</span>
        </span>
        <span aria-hidden className="text-sm" style={{ color: "var(--ink-2)", transform: open ? "rotate(180deg)" : undefined }}>
          ⌄
        </span>
      </button>
      {open && (
        <div className="overflow-y-auto" style={{ maxHeight: 280, borderTop: "1px solid rgba(38,54,43,0.08)" }}>
          {children}
        </div>
      )}
    </section>
  );
}
