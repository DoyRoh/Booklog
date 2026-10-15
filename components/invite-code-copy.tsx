"use client";

import { useState } from "react";

/** 초대 코드 + 누르면 바로 복사되는 버튼. 클립보드 API가 막힌 환경(오래된 웹뷰)은 임시 textarea로 대신 복사한다. */
export default function InviteCodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const t = document.createElement("textarea");
      t.value = code;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`초대 코드 ${code} 복사`}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 align-middle"
      style={{ borderColor: "var(--point-deep)", background: "var(--card)" }}
    >
      <span className="d text-sm tracking-[0.08em]" style={{ color: "var(--point-deep)" }}>
        {code}
      </span>
      <span className="text-xs" style={{ color: copied ? "var(--point)" : "var(--ink-2)" }}>
        {copied ? "복사됨" : "복사"}
      </span>
    </button>
  );
}
