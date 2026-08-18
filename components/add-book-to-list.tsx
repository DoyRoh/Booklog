"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Candidate = {
  title: string;
  author: string;
  coverUrl: string | null;
  isbn: string;
};

export default function AddBookToList({ bookListId }: { bookListId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`/api/books/lookup?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "검색에 실패했어요.");
        setSearching(false);
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError("검색 중 문제가 생겼어요.");
    }
    setSearching(false);
  }

  async function addCandidate(candidate: Candidate) {
    setAdding(candidate.isbn || candidate.title);
    setError(null);

    const supabase = createClient();
    let bookId: string | null = null;

    if (candidate.isbn) {
      const { data: existing } = await supabase
        .from("book_isbns")
        .select("book_id")
        .eq("isbn", candidate.isbn)
        .maybeSingle();
      if (existing) bookId = existing.book_id;
    }

    if (!bookId) {
      bookId = crypto.randomUUID();
      const { error: bookError } = await supabase.from("books").insert({
        id: bookId,
        title: candidate.title,
        author: candidate.author || null,
        cover_url: candidate.coverUrl,
        source: candidate.isbn ? "kakao" : "manual",
      });
      if (bookError) {
        setError(bookError.message);
        setAdding(null);
        return;
      }
      if (candidate.isbn) {
        const { error: isbnError } = await supabase
          .from("book_isbns")
          .insert({ book_id: bookId, isbn: candidate.isbn });
        if (isbnError) {
          setError(isbnError.message);
          setAdding(null);
          return;
        }
      }
    }

    const { data: already } = await supabase
      .from("book_list_items")
      .select("id")
      .eq("book_list_id", bookListId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (!already) {
      const { error: itemError } = await supabase
        .from("book_list_items")
        .insert({ book_list_id: bookListId, book_id: bookId });
      if (itemError) {
        setError(itemError.message);
        setAdding(null);
        return;
      }
    }

    setAdding(null);
    setResults(null);
    setQuery("");
    router.refresh();
  }

  async function addManual() {
    if (!manualTitle.trim()) return;
    await addCandidate({
      title: manualTitle.trim(),
      author: manualAuthor.trim(),
      coverUrl: null,
      isbn: "",
    });
    setManualMode(false);
    setManualTitle("");
    setManualAuthor("");
  }

  return (
    <div
      className="rounded-[var(--r)] border p-4"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      <p className="d text-sm">책 추가</p>

      {!manualMode && (
        <>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="책 제목으로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="flex-1 rounded-[14px] border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--rule)" }}
            />
            <button
              type="button"
              disabled={!query.trim() || searching}
              onClick={search}
              className="d rounded-[14px] px-4 py-2.5 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              검색
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}

          {results && results.length === 0 && (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
              검색 결과가 없어요.
            </p>
          )}

          {results && results.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {results.map((candidate) => (
                <button
                  key={candidate.isbn || candidate.title}
                  type="button"
                  disabled={adding !== null}
                  onClick={() => addCandidate(candidate)}
                  className="flex items-center gap-3 rounded-[10px] border p-2 text-left disabled:opacity-50"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {candidate.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={candidate.coverUrl}
                      alt=""
                      className="h-14 w-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm">{candidate.title}</p>
                    {candidate.author && (
                      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                        {candidate.author}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="d mt-3 text-sm"
            style={{ color: "var(--point)" }}
          >
            검색에 안 나오는 책이에요
          </button>
        </>
      )}

      {manualMode && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            type="text"
            placeholder="책 제목"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            className="rounded-[14px] border px-4 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--rule)" }}
          />
          <input
            type="text"
            placeholder="지은이 (선택)"
            value={manualAuthor}
            onChange={(e) => setManualAuthor(e.target.value)}
            className="rounded-[14px] border px-4 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--rule)" }}
          />
          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="d flex-1 rounded-[14px] border py-2.5 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!manualTitle.trim() || adding !== null}
              onClick={addManual}
              className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
