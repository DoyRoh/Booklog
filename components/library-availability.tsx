"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadMyLibraries, loadMyRegion, LIBRARIES_CHANGED, type SavedLibrary } from "@/lib/my-libraries";
import { REGIONS } from "@/lib/library-regions";

type Holding = { code: string; name: string; address: string; loanAvailable: boolean | null };

const COLLAPSE_KEY = "chaeksup:library-box-collapsed";

type Result = { code: string; hasBook?: boolean; loanAvailable?: boolean; error?: true };

/** 내 도서관(최대 3곳)에 이 책이 있는지, 지금 빌릴 수 있는지.
 *  기록 고치기 창은 bookId로(카탈로그의 ISBN을 찾아서), 기록 남기기 화면은
 *  검색으로 고른 책의 isbn을 바로 넘긴다(아직 카탈로그에 없는 새 책일 수 있어서). */
export default function LibraryAvailability({ bookId, isbn: isbnProp }: { bookId?: string | null; isbn?: string | null }) {
  const [supabase] = useState(() => createClient());
  const [mine, setMine] = useState<SavedLibrary[] | null>(null);
  const [fetched, setFetched] = useState<{ bookId: string; isbn: string | null } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 접어 둔 상태는 기기에 기억한다(기록 남기기·고치기 어디서든 같은 상태).
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  function toggleCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {}
  }

  useEffect(() => {
    const load = () => loadMyLibraries(supabase).then(setMine);
    load();
    window.addEventListener(LIBRARIES_CHANGED, load);
    return () => window.removeEventListener(LIBRARIES_CHANGED, load);
  }, [supabase]);

  const direct = (isbnProp ?? "").replace(/[^0-9X]/gi, "");
  const isbn: string | null | undefined =
    direct.length === 13 ? direct : !bookId ? null : fetched?.bookId === bookId ? fetched.isbn : undefined;
  useEffect(() => {
    if (direct.length === 13 || !bookId) return;
    supabase
      .from("book_isbns")
      .select("isbn")
      .eq("book_id", bookId)
      .then(({ data }) => {
        const all = (data ?? []).map((r) => r.isbn.replace(/[^0-9X]/gi, ""));
        setFetched({ bookId, isbn: all.find((v) => v.length === 13) ?? null });
      });
  }, [supabase, bookId, direct]);

  useEffect(() => {
    if (!isbn || !mine || mine.length === 0) return;
    let cancelled = false;
    fetch(`/api/libraries/availability?isbn=${isbn}&libs=${mine.map((l) => l.code).join(",")}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(json.error ?? "불러오지 못했어요.");
        else setResults(json.results as Result[]);
      })
      .catch(() => !cancelled && setError("불러오지 못했어요."));
    return () => {
      cancelled = true;
    };
  }, [isbn, mine]);

  if (mine === null || isbn === undefined) return null;

  return (
    <div className="mt-4 rounded-[14px] border px-4 py-3" style={{ borderColor: "var(--rule)" }}>
      <button
        type="button"
        onClick={() => toggleCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="d text-sm">근처 도서관</span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--ink-2)" }}>
          {collapsed ? "펼치기" : "접기"}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden
            style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 200ms" }}>
            <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {collapsed ? null : <>
      {mine.length === 0 ? (
        <Link href="/more#my-libraries" className="mt-1 block text-xs" style={{ color: "var(--point-deep)" }}>
          자주 가는 도서관을 정하면 빌릴 수 있는지 알려 줘요 ›
        </Link>
      ) : isbn === null ? (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
          ISBN이 없는 책이라 도서관에서 찾아볼 수 없어요.
        </p>
      ) : error ? (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
          {error}
        </p>
      ) : (
        <>
          <ul className="mt-1">
            {mine.map((lib) => {
              const r = results?.find((x) => x.code === lib.code);
              const [label, color] = !r
                ? ["확인 중…", "var(--ink-2)"]
                : r.error
                  ? ["확인 못 함", "var(--ink-2)"]
                  : !r.hasBook
                    ? ["없어요", "var(--ink-2)"]
                    : r.loanAvailable
                      ? ["빌릴 수 있어요", "var(--point-deep)"]
                      : ["대출 중", "var(--lantern)"];
              return (
                <li key={lib.code} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-sm">{lib.name}</span>
                  <span className="d flex-none text-xs" style={{ color }}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-[11px]" style={{ color: "var(--ink-2)" }}>
            도서관 정보나루 기준이라 실제와 조금 다를 수 있어요.
          </p>
        </>
      )}
      {isbn && <HoldingFinder isbn={isbn} supabase={supabase} />}
      </>}
    </div>
  );
}

/** "다른 도서관에서 찾기" — 한 지역에서 이 책을 가진 도서관 전부(대출 가능한 곳이 위로). */
function HoldingFinder({ isbn, supabase }: { isbn: string; supabase: ReturnType<typeof createClient> }) {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState("");
  const [list, setList] = useState<Holding[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState<string | null>(null);

  // 대출 여부를 아직 안 본 도서관(앞 10곳 밖)은 눌러서 그 자리에서 확인한다.
  async function checkOne(code: string) {
    setChecking(code);
    try {
      const res = await fetch(`/api/libraries/availability?isbn=${isbn}&libs=${code}`);
      const json = await res.json();
      const r = (json.results as Result[] | undefined)?.[0];
      if (res.ok && r && !r.error) {
        setList((prev) =>
          prev ? prev.map((l) => (l.code === code ? { ...l, loanAvailable: Boolean(r.hasBook && r.loanAvailable) } : l)) : prev
        );
      }
    } finally {
      setChecking(null);
    }
  }

  async function search(code: string) {
    setRegion(code);
    setList(null);
    setError(null);
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/libraries/holding?isbn=${isbn}&region=${code}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "불러오지 못했어요.");
      setList(json.libraries as Holding[]);
      setTotal(json.total as number);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = (list ?? []).filter((lib) => {
    const hay = `${lib.name} ${lib.address}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={async () => {
          setOpen(true);
          const saved = await loadMyRegion(supabase);
          if (saved) search(saved);
        }}
        className="mt-2 text-xs"
        style={{ color: "var(--point-deep)" }}
      >
        다른 도서관에서 찾기 ›
      </button>
    );
  }

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: "rgba(38,54,43,0.08)" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="d text-xs">이 책이 있는 도서관</p>
        <select
          value={region}
          onChange={(e) => search(e.target.value)}
          aria-label="지역"
          className="rounded-[10px] border px-2 py-1 text-xs"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          <option value="">지역 고르기</option>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {loading && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
          찾는 중…
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
          {error}
        </p>
      )}
      {list && list.length === 0 && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
          이 지역 공공도서관에는 없어요.
        </p>
      )}
      {list && list.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="도서관 이름·동네로 찾기"
          aria-label="도서관 검색"
          className="mt-2 w-full min-w-0 rounded-[10px] border px-3 py-2 text-sm"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />
      )}
      {list && list.length > 0 && shown.length === 0 && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
          &ldquo;{query.trim()}&rdquo;에 맞는 도서관이 없어요. 이 책을 가진 도서관만 보여요.
        </p>
      )}
      {list && shown.length > 0 && (
        <ul className="mt-1 max-h-56 overflow-y-auto">
          {shown.map((lib) => {
            const [label, color] =
              lib.loanAvailable === true
                ? ["빌릴 수 있어요", "var(--point-deep)"]
                : lib.loanAvailable === false
                  ? ["대출 중", "var(--lantern)"]
                  : ["있어요", "var(--ink-2)"];
            return (
              <li key={lib.code} className="flex items-center justify-between gap-3 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{lib.name}</span>
                  <span className="block truncate text-[11px]" style={{ color: "var(--ink-2)" }}>
                    {lib.address}
                  </span>
                </span>
                {lib.loanAvailable === null ? (
                  <button
                    type="button"
                    onClick={() => checkOne(lib.code)}
                    disabled={checking === lib.code}
                    className="d flex-none rounded-full border px-2.5 py-1 text-xs disabled:opacity-40"
                    style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
                  >
                    {checking === lib.code ? "확인 중…" : "대출 확인"}
                  </button>
                ) : (
                  <span className="d flex-none text-xs" style={{ color }}>
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {list && total > 10 && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--ink-2)" }}>
          위에서부터 10곳은 바로 확인했어요. 나머지는 &ldquo;대출 확인&rdquo;을 눌러 주세요.
        </p>
      )}
    </div>
  );
}
