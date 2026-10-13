"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadMyLibraries, loadMyRegion, LIBRARIES_CHANGED, type SavedLibrary } from "@/lib/my-libraries";
import { REGIONS } from "@/lib/library-regions";

type Holding = { code: string; name: string; address: string; loanAvailable: boolean | null };

type Result = { code: string; hasBook?: boolean; loanAvailable?: boolean; error?: true };

/** 기록 고치기 창 안: 내 도서관(최대 3곳)에 이 책이 있는지, 지금 빌릴 수 있는지. */
export default function LibraryAvailability({ bookId }: { bookId: string }) {
  const [supabase] = useState(() => createClient());
  const [mine, setMine] = useState<SavedLibrary[] | null>(null);
  const [isbn, setIsbn] = useState<string | null | undefined>(undefined);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => loadMyLibraries(supabase).then(setMine);
    load();
    window.addEventListener(LIBRARIES_CHANGED, load);
    return () => window.removeEventListener(LIBRARIES_CHANGED, load);
  }, [supabase]);

  useEffect(() => {
    supabase
      .from("book_isbns")
      .select("isbn")
      .eq("book_id", bookId)
      .then(({ data }) => {
        const all = (data ?? []).map((r) => r.isbn.replace(/[^0-9X]/gi, ""));
        setIsbn(all.find((v) => v.length === 13) ?? null);
      });
  }, [supabase, bookId]);

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
      <p className="d text-sm">근처 도서관</p>
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
        <ul className="mt-1 max-h-56 overflow-y-auto">
          {list.map((lib) => {
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
                <span className="d flex-none text-xs" style={{ color }}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {list && total > 10 && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--ink-2)" }}>
          대출 여부는 위에서부터 10곳까지만 확인해요.
        </p>
      )}
    </div>
  );
}
