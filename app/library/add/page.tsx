"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BarcodeScanner from "@/components/barcode-scanner";

type Step = "choose" | "scan" | "manual" | "looking-up" | "preview" | "duplicate" | "saved";

type LookupResult = {
  title: string;
  author: string;
  publisher: string;
  coverUrl: string | null;
  introduction: string;
  publishDate: string | null;
  isbn: string;
};

type ExistingBook = {
  title: string;
  author: string | null;
  coverUrl: string | null;
};

export default function AddBookPage() {
  const [step, setStep] = useState<Step>("choose");
  const [manualIsbn, setManualIsbn] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [existing, setExisting] = useState<ExistingBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function lookup(isbn: string) {
    setError(null);
    setStep("looking-up");

    const supabase = createClient();

    // 이미 등록된 책이면 카카오 API를 호출할 필요 없이 바로 보여준다 (중복 방지).
    const { data: existingIsbn } = await supabase
      .from("book_isbns")
      .select("book_id, books(title, author, cover_url)")
      .eq("isbn", isbn)
      .maybeSingle();

    if (existingIsbn?.books) {
      const book = existingIsbn.books as unknown as {
        title: string;
        author: string | null;
        cover_url: string | null;
      };
      setExisting({ title: book.title, author: book.author, coverUrl: book.cover_url });
      setStep("duplicate");
      return;
    }

    try {
      const res = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(isbn)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "책을 찾지 못했어요.");
        setStep("manual");
        return;
      }
      setResult(data as LookupResult);
      setStep("preview");
    } catch {
      setError("책 정보를 불러오는 중 문제가 생겼어요.");
      setStep("manual");
    }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const bookId = crypto.randomUUID();

    const { error: bookError } = await supabase.from("books").insert({
      id: bookId,
      title: result.title,
      author: result.author || null,
      publisher: result.publisher || null,
      cover_url: result.coverUrl,
      introduction: result.introduction || null,
      publish_date: result.publishDate,
      source: "kakao",
    });
    if (bookError) {
      setError(bookError.message);
      setSaving(false);
      return;
    }

    const { error: isbnError } = await supabase
      .from("book_isbns")
      .insert({ book_id: bookId, isbn: result.isbn });
    if (isbnError) {
      setError(isbnError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setStep("saved");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col px-6 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="d text-xl">책 등록</h1>
        <Link href="/library" className="text-sm" style={{ color: "var(--ink-2)" }}>
          닫기
        </Link>
      </div>

      {step === "choose" && (
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setStep("scan")}
            className="d rounded-[var(--r)] border px-4 py-4 text-left"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            카메라로 바코드 스캔
          </button>
          <button
            type="button"
            onClick={() => setStep("manual")}
            className="d rounded-[var(--r)] border px-4 py-4 text-left"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            ISBN 직접 입력
          </button>
        </div>
      )}

      {step === "scan" && (
        <div className="mt-8 flex flex-col gap-4">
          <BarcodeScanner
            onDetected={(isbn) => lookup(isbn)}
            onError={(message) => setError(message)}
          />
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            책 뒷면 바코드를 화면 안에 맞춰주세요.
          </p>
          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => setStep("manual")}
            className="d text-sm"
            style={{ color: "var(--point)" }}
          >
            대신 직접 입력할게요
          </button>
        </div>
      )}

      {step === "manual" && (
        <div className="mt-8 flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            placeholder="ISBN 13자리 (예: 9788934942467)"
            value={manualIsbn}
            onChange={(e) => setManualIsbn(e.target.value.replace(/[^\d]/g, ""))}
            className="rounded-[14px] border px-4 py-3 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={manualIsbn.length !== 10 && manualIsbn.length !== 13}
            onClick={() => lookup(manualIsbn)}
            className="d rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            조회하기
          </button>
        </div>
      )}

      {step === "looking-up" && (
        <p className="mt-8 text-sm" style={{ color: "var(--ink-2)" }}>
          책 정보를 찾는 중...
        </p>
      )}

      {step === "duplicate" && existing && (
        <div className="mt-8 flex flex-col gap-4">
          <p className="d text-lg">이미 등록된 책이에요</p>
          <div
            className="flex gap-3 rounded-[var(--r)] border p-4"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            {existing.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={existing.coverUrl} alt="" className="h-24 w-16 rounded object-cover" />
            )}
            <div>
              <p className="d">{existing.title}</p>
              {existing.author && (
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {existing.author}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/library"
            className="d rounded-[14px] py-3 text-center text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            책장으로
          </Link>
        </div>
      )}

      {step === "preview" && result && (
        <div className="mt-8 flex flex-col gap-4">
          <p className="d text-lg">이 책이 맞나요?</p>
          <div
            className="flex gap-3 rounded-[var(--r)] border p-4"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            {result.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.coverUrl} alt="" className="h-28 w-20 rounded object-cover" />
            )}
            <div>
              <p className="d">{result.title}</p>
              {result.author && (
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {result.author}
                </p>
              )}
              {result.publisher && (
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {result.publisher}
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setStep("choose");
              }}
              className="d flex-1 rounded-[14px] border py-3 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              다시 하기
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              {saving ? "등록 중..." : "책장에 등록"}
            </button>
          </div>
        </div>
      )}

      {step === "saved" && (
        <div className="mt-8 flex flex-col gap-4">
          <p className="d text-lg">책장에 등록됐어요!</p>
          <Link
            href="/library"
            className="d rounded-[14px] py-3 text-center text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            책장으로
          </Link>
        </div>
      )}
    </div>
  );
}
