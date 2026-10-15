"use client";

import { useState } from "react";
import { NLCY_CATEGORIES } from "@/lib/nlcy-categories";

type Result = {
  months: string[];
  books: { title: string; author: string | null; month: string }[];
  added: number;
  missed?: string[];
  dryRun: boolean;
  debug: { pagesFetched: number; note?: string };
};

// 운영자 전용: 국립어린이청소년도서관 사서추천도서(2025·2026)를 분류별 그룹에 넣는다.
// 누리집의 "목록다운로드(엑셀)"을 연도별로 받아 읽는다. "미리보기"는 읽기만 한다.
export default function AdminNlcyImport() {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [allLines, setAllLines] = useState<string[] | null>(null);

  async function run(key: string, tab: string, dryRun: boolean) {
    setBusy(key + dryRun);
    setError(null);
    setResult(null);
    setAllLines(null);
    setLabel(`${tab} ${dryRun ? "미리보기" : "가져오기"}`);
    try {
      const res = await fetch("/api/admin/nlcy-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: key, dryRun }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "실패했어요.");
      setResult(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // 다섯 분류를 차례로 가져온다(한 요청이 서버 시간 제한에 걸리지 않게 분류마다 따로 부름).
  async function runAll() {
    setBusy("all");
    setError(null);
    setResult(null);
    const lines: string[] = [];
    for (const c of NLCY_CATEGORIES) {
      setLabel(`전체 가져오기 · ${c.tab}…`);
      try {
        const res = await fetch("/api/admin/nlcy-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: c.key, dryRun: false }),
        });
        const body = await res.json();
        lines.push(res.ok ? `${c.tab}: ${body.books.length}권 중 새로 ${body.added}권` : `${c.tab}: 실패 — ${body.error}`);
      } catch (e) {
        lines.push(`${c.tab}: 실패 — ${(e as Error).message}`);
      }
    }
    setLabel("전체 가져오기");
    setAllLines(lines);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
        국립어린이청소년도서관 사서추천도서 (작년·올해) · 매달 3일 새벽에 자동으로도 가져와요
      </p>
      <button
        type="button"
        disabled={busy !== null}
        onClick={runAll}
        className="d rounded-[14px] px-3 py-2 text-sm text-white disabled:opacity-40"
        style={{ background: "var(--point-deep)" }}
      >
        {busy === "all" ? label : "다섯 분류 한 번에 가져오기"}
      </button>
      {allLines && (
        <ul className="rounded-[14px] border p-3 text-xs" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>
          {allLines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {NLCY_CATEGORIES.map((c) => (
        <div key={c.key} className="flex items-center gap-2">
          <span className="d min-w-0 flex-1 truncate text-sm">{c.tab}</span>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run(c.key, c.tab, true)}
            className="d rounded-[14px] border px-3 py-1.5 text-xs disabled:opacity-40"
            style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
          >
            {busy === c.key + "true" ? "읽는 중…" : "미리보기"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run(c.key, c.tab, false)}
            className="d rounded-[14px] px-3 py-1.5 text-xs text-white disabled:opacity-40"
            style={{ background: "var(--point-deep)" }}
          >
            {busy === c.key + "false" ? "가져오는 중…" : "가져오기"}
          </button>
        </div>
      ))}

      {error && (
        <p className="text-xs" style={{ color: "var(--berry)" }}>
          {label}: {error}
        </p>
      )}
      {result && (
        <div className="mt-1 rounded-[14px] border p-3 text-xs" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>
          <p className="d" style={{ color: "var(--ink)" }}>
            {label} · 책 {result.books.length}권
            {!result.dryRun && result.books.length > 0 && ` · 새로 넣음 ${result.added}권`}
          </p>
          <p className="mt-1">
            추천 {result.months.length}회 ({result.months.join(", ") || "없음"})
          </p>
          {result.debug.note && <p className="mt-1">{result.debug.note}</p>}
          {result.missed && result.missed.length > 0 && <p className="mt-1">표지 못 찾음: {result.missed.join(", ")}</p>}
          {result.books.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto">
              {result.books.map((b) => (
                <li key={b.month + b.title} className="truncate">
                  {b.month} · {b.title}
                  {b.author ? ` / ${b.author}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
