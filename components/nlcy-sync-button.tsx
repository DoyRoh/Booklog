"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NlcySyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setStatus("syncing");
    setMessage(null);
    try {
      const res = await fetch("/api/curators/nlcy/sync-now", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "동기화에 실패했어요.");
        return;
      }
      setStatus("done");
      setMessage(`${data.added}권 추가, ${data.skipped}권은 이미 있어서 건너뜀`);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("동기화 요청 중 문제가 생겼어요.");
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={sync}
        disabled={status === "syncing"}
        className="d self-start rounded-[14px] border px-3 py-1.5 text-xs disabled:opacity-40"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        {status === "syncing" ? "동기화 중..." : "지금 동기화"}
      </button>
      {message && (
        <p className="text-xs" style={{ color: status === "error" ? "var(--berry)" : "var(--ink-2)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
