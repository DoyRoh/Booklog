"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REGIONS } from "@/lib/library-regions";
import { loadMyLibraries, saveMyLibraries, MAX_LIBRARIES, type SavedLibrary } from "@/lib/my-libraries";

type Lib = { code: string; name: string; address: string };

export default function MyLibraries() {
  const [supabase] = useState(() => createClient());
  const [mine, setMine] = useState<SavedLibrary[]>([]);
  const [adding, setAdding] = useState(false);
  const [region, setRegion] = useState("");
  const [libs, setLibs] = useState<Lib[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMyLibraries(supabase).then(setMine);
  }, [supabase]);

  async function pickRegion(code: string) {
    setRegion(code);
    setLibs(null);
    setQuery("");
    setError(null);
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/libraries?region=${code}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "도서관 목록을 불러오지 못했어요.");
      setLibs(json.libraries as Lib[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function update(next: SavedLibrary[]) {
    const prev = mine;
    setMine(next);
    const err = await saveMyLibraries(supabase, next);
    if (err) {
      setMine(prev);
      setError("저장하지 못했어요. 다시 시도해 주세요.");
    }
  }

  const filtered = useMemo(() => {
    if (!libs) return [];
    const q = query.trim().replace(/\s+/g, "");
    const list = q ? libs.filter((l) => (l.name + l.address).replace(/\s+/g, "").includes(q)) : libs;
    return list.slice(0, 40);
  }, [libs, query]);

  const full = mine.length >= MAX_LIBRARIES;

  return (
    <div>
      {mine.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          아직 정한 도서관이 없어요.
        </p>
      ) : (
        <ul>
          {mine.map((lib, i) => (
            <li
              key={lib.code}
              className="flex items-center justify-between gap-3 py-2.5"
              style={{ borderTop: i ? "1px solid rgba(38,54,43,0.08)" : undefined }}
            >
              <span className="d min-w-0 truncate text-sm">{lib.name}</span>
              <button
                type="button"
                onClick={() => update(mine.filter((l) => l.code !== lib.code))}
                className="flex-none text-xs"
                style={{ color: "var(--ink-2)" }}
              >
                빼기
              </button>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <button
          type="button"
          disabled={full}
          onClick={() => setAdding(true)}
          className="d mt-3 w-full rounded-[14px] border border-dashed py-2.5 text-sm disabled:opacity-50"
          style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
        >
          {full ? `최대 ${MAX_LIBRARIES}곳까지 고를 수 있어요` : "+ 도서관 추가"}
        </button>
      ) : (
        <div className="mt-3 rounded-[14px] border p-3" style={{ borderColor: "var(--rule)" }}>
          <div className="flex gap-2">
            <select
              value={region}
              onChange={(e) => pickRegion(e.target.value)}
              aria-label="지역"
              className="flex-none rounded-[12px] border px-2 py-2 text-sm"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              <option value="">지역</option>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!libs}
              placeholder="도서관·동네 이름"
              className="min-w-0 flex-1 rounded-[12px] border px-3 py-2 text-sm outline-none disabled:opacity-50"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            />
          </div>

          {loading && (
            <p className="mt-3 text-xs" style={{ color: "var(--ink-2)" }}>
              도서관을 불러오는 중…
            </p>
          )}
          {libs && (
            <ul className="mt-2 max-h-64 overflow-y-auto">
              {filtered.length === 0 && (
                <li className="py-2 text-xs" style={{ color: "var(--ink-2)" }}>
                  맞는 도서관이 없어요.
                </li>
              )}
              {filtered.map((lib) => {
                const picked = mine.some((m) => m.code === lib.code);
                return (
                  <li key={lib.code}>
                    <button
                      type="button"
                      disabled={picked || full}
                      onClick={async () => {
                        await update([...mine, { code: lib.code, name: lib.name }]);
                        setAdding(false);
                        setRegion("");
                        setLibs(null);
                        setQuery("");
                      }}
                      className="w-full py-2 text-left disabled:opacity-50"
                      style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}
                    >
                      <span className="d block text-sm">{lib.name}</span>
                      <span className="block truncate text-xs" style={{ color: "var(--ink-2)" }}>
                        {lib.address}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setRegion("");
              setLibs(null);
              setQuery("");
            }}
            className="mt-2 text-xs"
            style={{ color: "var(--ink-2)" }}
          >
            닫기
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
