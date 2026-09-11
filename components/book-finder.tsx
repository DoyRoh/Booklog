"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BarcodeScanner from "@/components/barcode-scanner";
import PhotoPicker from "@/components/photo-picker";
import { uploadBookCover } from "@/lib/storage";
import type { BookCandidate } from "@/lib/book-catalog";

type Mode = "search" | "scan" | "isbn";

// 책을 "찾는" 부분만 떼어낸 공용 조각: 제목 검색 / 바코드 스캔 / ISBN 입력 /
// 검색에 없는 책 직접 입력. 후보를 고르면 onPick으로 넘기고, 그걸 어디에
// 넣을지(추천도서 목록, 숙제)는 부르는 쪽이 정한다.
export default function BookFinder({
  onPick,
  placeholder = "책 제목으로 검색",
}: {
  onPick: (candidate: BookCandidate) => void;
  placeholder?: string;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [results, setResults] = useState<BookCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualCover, setManualCover] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResults(null);
    setManualMode(false);
    setManualCover(null);
  }

  function pick(candidate: BookCandidate) {
    onPick(candidate);
    setResults(null);
    setQuery("");
    setManualIsbn("");
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

  // 카카오 검색에 낱권 ISBN이 없는 전권 세트 등은 표지도 못 찾아오므로,
  // 직접 입력할 때 사진으로 찍어 올릴 수 있게 한다(선택 사항).
  async function addManual() {
    if (!manualTitle.trim()) return;
    let coverUrl: string | null = null;
    if (manualCover) {
      setUploadingCover(true);
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("로그인이 필요해요.");
        coverUrl = await uploadBookCover(supabase, user.id, manualCover);
      } catch {
        setError("표지 사진을 올리지 못했어요. 표지 없이 저장하거나 다시 시도해 주세요.");
        setUploadingCover(false);
        return;
      }
      setUploadingCover(false);
    }
    pick({
      title: manualTitle.trim(),
      author: manualAuthor.trim(),
      coverUrl,
      isbn: "",
    });
    setManualMode(false);
    setManualTitle("");
    setManualAuthor("");
    setManualCover(null);
  }

  return (
    <div>
      {!manualMode && (
        <div className="flex gap-2">
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
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="min-w-0 flex-1 rounded-[14px] border px-4 py-2.5 text-sm outline-none"
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
      )}

      {!manualMode && mode === "scan" && (
        <div className="mt-2 flex flex-col gap-3">
          <BarcodeScanner onDetected={(isbn) => lookupIsbn(isbn)} onError={(message) => setError(message)} />
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
            className="min-w-0 flex-1 rounded-[14px] border px-4 py-2.5 text-sm outline-none"
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
                  onClick={() => pick(candidate)}
                  className="flex items-center gap-3 rounded-[10px] border p-2 text-left"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {candidate.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={candidate.coverUrl} alt="" className="h-14 w-10 rounded object-cover" />
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

          <button type="button" onClick={() => setManualMode(true)} className="d mt-3 text-sm" style={{ color: "var(--point)" }}>
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
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--ink-2)" }}>
              표지 사진 (선택) · 전권 세트처럼 검색에 안 나오는 책도 찍어서 올려 두면 알아보기 쉬워요
            </p>
            <PhotoPicker onSelect={setManualCover} label="표지 찍어 올리기" />
          </div>
          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setManualMode(false);
                setManualCover(null);
                setError(null);
              }}
              className="d flex-1 rounded-[14px] border py-2.5 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!manualTitle.trim() || uploadingCover}
              onClick={addManual}
              className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              {uploadingCover ? "표지 올리는 중..." : "다음"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
