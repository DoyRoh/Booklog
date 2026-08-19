"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BarcodeScanner from "@/components/barcode-scanner";
import { BOOK_CATEGORIES } from "@/lib/categories";

type Candidate = {
  title: string;
  author: string;
  coverUrl: string | null;
  isbn: string;
};

type Mode = "search" | "scan" | "isbn";

export default function AddBookToList({ bookListId }: { bookListId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");

  // 후보를 고르면 바로 추가하지 않고, 분야·필독 여부를 정한 뒤 확정한다.
  const [pending, setPending] = useState<Candidate | null>(null);
  const [pendingCategories, setPendingCategories] = useState<Set<string>>(new Set());
  const [pendingRequired, setPendingRequired] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResults(null);
    setManualMode(false);
  }

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

  async function lookupIsbn(isbn: string) {
    if (!isbn) return;
    setSearching(true);
    setError(null);
    setResults(null);

    const supabase = createClient();

    // 이미 등록된 책이면 카카오 API를 부르지 않고 바로 후보로 보여준다.
    const { data: existingIsbn } = await supabase
      .from("book_isbns")
      .select("book_id, books(title, author, cover_url)")
      .eq("isbn", isbn)
      .maybeSingle();

    if (existingIsbn?.books) {
      const existingBook = existingIsbn.books as unknown as {
        title: string;
        author: string | null;
        cover_url: string | null;
      };
      setResults([
        {
          title: existingBook.title,
          author: existingBook.author ?? "",
          coverUrl: existingBook.cover_url,
          isbn,
        },
      ]);
      setSearching(false);
      return;
    }

    try {
      const res = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(isbn)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "이 ISBN으로 책을 찾지 못했어요.");
        setSearching(false);
        return;
      }
      setResults([
        {
          title: data.title,
          author: data.author ?? "",
          coverUrl: data.coverUrl ?? null,
          isbn: data.isbn || isbn,
        },
      ]);
    } catch {
      setError("책 정보를 불러오는 중 문제가 생겼어요.");
    }
    setSearching(false);
  }

  function pickCandidate(candidate: Candidate) {
    setPending(candidate);
    setPendingCategories(new Set());
    setPendingRequired(false);
  }

  function toggleCategory(category: string) {
    setPendingCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  async function confirmAdd() {
    if (!pending) return;
    setAdding(true);
    setError(null);

    const supabase = createClient();
    let bookId: string | null = null;

    if (pending.isbn) {
      const { data: existing } = await supabase
        .from("book_isbns")
        .select("book_id")
        .eq("isbn", pending.isbn)
        .maybeSingle();
      if (existing) bookId = existing.book_id;
    }

    if (!bookId) {
      bookId = crypto.randomUUID();
      const { error: bookError } = await supabase.from("books").insert({
        id: bookId,
        title: pending.title,
        author: pending.author || null,
        cover_url: pending.coverUrl,
        source: pending.isbn ? "kakao" : "manual",
      });
      if (bookError) {
        setError(bookError.message);
        setAdding(false);
        return;
      }
      if (pending.isbn) {
        const { error: isbnError } = await supabase
          .from("book_isbns")
          .insert({ book_id: bookId, isbn: pending.isbn });
        if (isbnError) {
          setError(isbnError.message);
          setAdding(false);
          return;
        }
      }
    }

    if (pendingCategories.size > 0) {
      await supabase
        .from("book_categories")
        .insert(Array.from(pendingCategories).map((category) => ({ book_id: bookId, category })));
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
        .insert({ book_list_id: bookListId, book_id: bookId, required: pendingRequired });
      if (itemError) {
        setError(itemError.message);
        setAdding(false);
        return;
      }
    }

    setAdding(false);
    setPending(null);
    setResults(null);
    setQuery("");
    setManualIsbn("");
    router.refresh();
  }

  function addManual() {
    if (!manualTitle.trim()) return;
    pickCandidate({
      title: manualTitle.trim(),
      author: manualAuthor.trim(),
      coverUrl: null,
      isbn: "",
    });
    setManualMode(false);
    setManualTitle("");
    setManualAuthor("");
  }

  if (pending) {
    return (
      <div
        className="rounded-[var(--r)] border p-4"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <div className="flex items-center gap-3">
          {pending.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pending.coverUrl} alt="" className="h-16 w-11 flex-none rounded object-cover" />
          )}
          <div>
            <p className="d text-sm">{pending.title}</p>
            {pending.author && (
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {pending.author}
              </p>
            )}
          </div>
        </div>

        <p className="d mt-3 text-xs" style={{ color: "var(--ink-2)" }}>
          어느 분야인가요? (여러 개 선택 가능, 선택 안 해도 돼요)
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {BOOK_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className="d rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: pendingCategories.has(category) ? "var(--point)" : "var(--rule)",
                background: pendingCategories.has(category) ? "rgba(47,168,79,0.08)" : "transparent",
                color: pendingCategories.has(category) ? "var(--point-deep)" : "var(--ink-2)",
              }}
            >
              {category}
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pendingRequired}
            onChange={(e) => setPendingRequired(e.target.checked)}
          />
          필독 도서로 표시
        </label>

        {error && (
          <p className="mt-2 text-sm" style={{ color: "var(--berry)" }}>
            {error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setPending(null)}
            className="d flex-1 rounded-[14px] border py-2.5 text-sm"
            style={{ borderColor: "var(--rule)" }}
          >
            취소
          </button>
          <button
            type="button"
            disabled={adding}
            onClick={confirmAdd}
            className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            {adding ? "추가 중..." : "목록에 추가"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--r)] border p-4"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      <p className="d text-sm">책 추가</p>

      {!manualMode && (
        <div className="mt-2 flex gap-2">
          {(
            [
              { key: "search", label: "제목 검색" },
              { key: "scan", label: "바코드 스캔" },
              { key: "isbn", label: "ISBN 입력" },
            ] as { key: Mode; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => switchMode(key)}
              className="d rounded-full border px-3 py-1.5 text-xs"
              style={{
                borderColor: mode === key ? "var(--point)" : "var(--rule)",
                background: mode === key ? "rgba(47,168,79,0.08)" : "transparent",
                color: mode === key ? "var(--point-deep)" : "var(--ink-2)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!manualMode && mode === "search" && (
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
        </>
      )}

      {!manualMode && mode === "scan" && (
        <div className="mt-2 flex flex-col gap-3">
          <BarcodeScanner
            onDetected={(isbn) => lookupIsbn(isbn)}
            onError={(message) => setError(message)}
          />
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            책 뒷면 바코드를 화면 안에 맞춰주세요.
          </p>
        </div>
      )}

      {!manualMode && mode === "isbn" && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="ISBN 13자리 (예: 9788934942467)"
            value={manualIsbn}
            onChange={(e) => setManualIsbn(e.target.value.replace(/[^\d]/g, ""))}
            className="flex-1 rounded-[14px] border px-4 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--rule)" }}
          />
          <button
            type="button"
            disabled={(manualIsbn.length !== 10 && manualIsbn.length !== 13) || searching}
            onClick={() => lookupIsbn(manualIsbn)}
            className="d rounded-[14px] px-4 py-2.5 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            조회
          </button>
        </div>
      )}

      {!manualMode && (
        <>
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
                  onClick={() => pickCandidate(candidate)}
                  className="flex items-center gap-3 rounded-[10px] border p-2 text-left"
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
              disabled={!manualTitle.trim()}
              onClick={addManual}
              className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
