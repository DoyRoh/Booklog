"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadMyLibraries, type SavedLibrary } from "@/lib/my-libraries";

export type WantBook = { id: string; title: string; author: string | null; coverUrl: string | null; isbn: string | null };

type Result = { code: string; hasBook?: boolean; loanAvailable?: boolean; error?: true };
type Checked = { book: WantBook; available: string[]; onLoan: string[]; failed: boolean };

// 정보나루 하루 호출 한도 — 한 번에 확인하는 책 수와 동시 요청 수를 묶어 둔다.
const MAX_BOOKS = 40;
const CONCURRENCY = 3;

export default function BorrowableList({ books }: { books: WantBook[] }) {
  const [supabase] = useState(() => createClient());
  const [mine, setMine] = useState<SavedLibrary[] | null>(null);
  const [checked, setChecked] = useState<Checked[]>([]);
  const [started, setStarted] = useState(false);

  const withIsbn = books.filter((b) => b.isbn).slice(0, MAX_BOOKS);
  const noIsbn = books.length - books.filter((b) => b.isbn).length;

  useEffect(() => {
    loadMyLibraries(supabase).then(setMine);
  }, [supabase]);

  async function run() {
    if (!mine?.length) return;
    setStarted(true);
    setChecked([]);
    const names = new Map(mine.map((l) => [l.code, l.name]));
    const codes = mine.map((l) => l.code).join(",");
    let next = 0;
    async function worker() {
      while (next < withIsbn.length) {
        const book = withIsbn[next++];
        let item: Checked = { book, available: [], onLoan: [], failed: false };
        try {
          const res = await fetch(`/api/libraries/availability?isbn=${book.isbn}&libs=${codes}`);
          const json = await res.json();
          if (!res.ok) throw new Error();
          for (const r of json.results as Result[]) {
            const name = names.get(r.code) ?? r.code;
            if (r.error) continue;
            if (r.hasBook && r.loanAvailable) item.available.push(name);
            else if (r.hasBook) item.onLoan.push(name);
          }
        } catch {
          item = { ...item, failed: true };
        }
        setChecked((prev) => [...prev, item]);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  if (mine === null) return null;

  if (mine.length === 0) {
    return (
      <div className="mt-5 rounded-[var(--r)] border p-5" style={{ background: "var(--card)", borderColor: "var(--rule)" }}>
        <p className="text-sm">먼저 자주 가는 도서관을 정해 주세요.</p>
        <Link href="/more#my-libraries" className="d mt-2 block text-sm" style={{ color: "var(--point-deep)" }}>
          내 도서관 정하기 ›
        </Link>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
        책장에 <b>읽고 싶어요</b> 책이 아직 없어요. 추천도서에서 책갈피를 눌러 담아 보세요.
      </p>
    );
  }

  const done = checked.length >= withIsbn.length;
  const available = checked.filter((c) => c.available.length > 0);
  const onLoan = checked.filter((c) => c.available.length === 0 && c.onLoan.length > 0);
  const none = checked.filter((c) => c.available.length === 0 && c.onLoan.length === 0);

  return (
    <div className="mt-5">
      <div className="rounded-[var(--r)] border p-4" style={{ background: "var(--card)", borderColor: "var(--rule)" }}>
        <p className="text-xs" style={{ color: "var(--ink-2)" }}>
          {mine.map((l) => l.name).join(" · ")}
        </p>
        <button
          type="button"
          onClick={run}
          disabled={started && !done}
          className="d mt-3 w-full rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
          style={{ background: "var(--point-deep)" }}
        >
          {!started ? `읽고 싶어요 ${withIsbn.length}권 확인하기` : done ? "다시 확인하기" : `확인 중… ${checked.length}/${withIsbn.length}`}
        </button>
        <p className="mt-2 text-[11px]" style={{ color: "var(--ink-2)" }}>
          도서관 정보나루 기준이라 실제와 조금 다를 수 있어요.
          {noIsbn > 0 && ` ISBN이 없는 ${noIsbn}권은 확인할 수 없어요.`}
          {books.filter((b) => b.isbn).length > MAX_BOOKS && ` 최근에 담은 ${MAX_BOOKS}권까지만 확인해요.`}
        </p>
      </div>

      {started && (
        <>
          <Group title="빌릴 수 있어요" items={available} tone="var(--point-deep)" field="available" />
          <Group title="지금은 대출 중" items={onLoan} tone="var(--lantern)" field="onLoan" />
          {done && none.length > 0 && (
            <p className="mt-4 text-xs" style={{ color: "var(--ink-2)" }}>
              내 도서관에 없는 책 {none.length}권: {none.map((c) => c.book.title).join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Group({
  title,
  items,
  tone,
  field,
}: {
  title: string;
  items: Checked[];
  tone: string;
  field: "available" | "onLoan";
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 rounded-[var(--r)] border" style={{ background: "var(--card)", borderColor: "var(--rule)" }}>
      <p className="d px-[24px] pt-4 text-base" style={{ color: tone }}>
        {title} · {items.length}권
      </p>
      <ul className="mt-2 pb-2">
        {items.map((c, i) => (
          <li
            key={c.book.id}
            className="mx-[24px] flex items-center gap-3 py-2.5"
            style={{ borderTop: i ? "1px solid rgba(38,54,43,0.08)" : undefined }}
          >
            <div className="h-11 w-8 flex-none overflow-hidden rounded-[4px]" style={{ background: "var(--paper)" }}>
              {c.book.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.book.coverUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="d truncate text-sm">{c.book.title}</p>
              <p className="truncate text-xs" style={{ color: tone }}>
                {c[field].join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
