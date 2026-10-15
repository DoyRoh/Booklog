"use client";

import { useState } from "react";
import { NLCY_CATEGORIES } from "@/lib/nlcy-categories";

type Result = {
  months: string[];
  books: { title: string; author: string | null; month: string }[];
  added: number;
  missed?: string[];
  dryRun: boolean;
  debug: { startLinks?: { text: string; href: string }[]; tabLinks?: { text: string; href: string }[]; pagesFetched: number; note?: string };
};

// 운영자 전용: 국립어린이청소년도서관 사서추천도서(2025·2026)를 분류별 그룹에 넣는다.
// "미리보기"는 읽기만 하고, 못 찾으면 찾은 링크 목록을 보여 줘서 그대로 복사해
// 알려 주면 읽는 규칙을 고칠 수 있다.
export default function AdminNlcyImport() {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, tab: string, dryRun: boolean) {
    setBusy(key + dryRun);
    setError(null);
    setResult(null);
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

  const links = result?.debug.startLinks ?? result?.debug.tabLinks;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
        국립어린이청소년도서관 사서추천도서 (2025·2026년)
      </p>
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
            월 {result.months.length}개 ({result.months.join(", ") || "없음"}) · 페이지 {result.debug.pagesFetched}개 읽음
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
          {result.books.length === 0 && links && (
            <>
              <p className="mt-2" style={{ color: "var(--berry)" }}>
                책을 못 찾았어요. 아래 내용을 길게 눌러 복사해서 알려 주세요.
              </p>
              <textarea
                readOnly
                value={links.map((l) => `${l.text} | ${l.href}`).join("\n")}
                className="mt-1 h-40 w-full rounded-[10px] border p-2 text-[10px]"
                style={{ borderColor: "var(--rule)" }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
