"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print d rounded-[14px] px-4 py-2.5 text-sm text-white"
      style={{ background: "var(--point)" }}
    >
      인쇄 · PDF로 저장
    </button>
  );
}
