"use client";

import { useState } from "react";

// 운영자 전용: 책숲 공식 숲지기 책에 표지 채우기(/api/admin/fill-covers).
export default function AdminFillCovers() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/fill-covers", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "실패했어요.");
      setMessage(
        `표지 ${body.filled}권 채움` +
          (body.missed.length ? ` · 못 찾음 ${body.missed.length}권(${body.missed.join(", ")})` : "") +
          (body.remaining ? ` · 남은 책 ${body.remaining}권 — 한 번 더 눌러 주세요` : " · 다 끝났어요")
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="d rounded-[14px] px-4 py-2.5 text-sm text-white disabled:opacity-40"
        style={{ background: "var(--point-deep)" }}
      >
        {busy ? "채우는 중…" : "공식 숲지기 책 표지 채우기"}
      </button>
      {message && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
