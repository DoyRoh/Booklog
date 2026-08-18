"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveChild } from "@/lib/active-child";
import BarcodeScanner from "@/components/barcode-scanner";

type Step = "choose" | "scan" | "manual" | "looking-up" | "record" | "no-child" | "saved";

type ResolvedBook = {
  bookId: string | null; // null이면 아직 books에 없는 새 책
  title: string;
  author: string;
  publisher: string;
  coverUrl: string | null;
  introduction: string;
  publishDate: string | null;
  isbn: string;
  isNew: boolean;
};

const EMOTIONS = ["재밌어요", "웃겼어요", "감동적이에요", "슬퍼요", "그저그래요"];
const RATINGS = [1, 2, 3, 4, 5];

export default function AddBookPage() {
  const [step, setStep] = useState<Step>("choose");
  const [manualIsbn, setManualIsbn] = useState("");
  const [book, setBook] = useState<ResolvedBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [rating, setRating] = useState<number | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [memo, setMemo] = useState("");

  async function lookup(isbn: string) {
    setError(null);
    setStep("looking-up");

    const supabase = createClient();

    // 이미 등록된 책이면 카카오 API를 부르지 않고 바로 기록 단계로 넘어간다.
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
      setBook({
        bookId: existingIsbn.book_id,
        title: existingBook.title,
        author: existingBook.author ?? "",
        publisher: "",
        coverUrl: existingBook.cover_url,
        introduction: "",
        publishDate: null,
        isbn,
        isNew: false,
      });
      setStep("record");
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
      setBook({ ...data, bookId: null, isNew: true } as ResolvedBook);
      setStep("record");
    } catch {
      setError("책 정보를 불러오는 중 문제가 생겼어요.");
      setStep("manual");
    }
  }

  async function save() {
    if (!book) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인 정보를 확인할 수 없어요.");
      setSaving(false);
      return;
    }

    const activeChild = await getActiveChild(supabase, user.id);
    if (!activeChild) {
      setStep("no-child");
      setSaving(false);
      return;
    }

    let bookId = book.bookId;
    if (!bookId) {
      bookId = crypto.randomUUID();
      const { error: bookError } = await supabase.from("books").insert({
        id: bookId,
        title: book.title,
        author: book.author || null,
        publisher: book.publisher || null,
        cover_url: book.coverUrl,
        introduction: book.introduction || null,
        publish_date: book.publishDate,
        source: "kakao",
      });
      if (bookError) {
        setError(bookError.message);
        setSaving(false);
        return;
      }

      const { error: isbnError } = await supabase
        .from("book_isbns")
        .insert({ book_id: bookId, isbn: book.isbn });
      if (isbnError) {
        setError(isbnError.message);
        setSaving(false);
        return;
      }
    }

    const { error: recordError } = await supabase.from("reading_records").insert({
      child_id: activeChild.id,
      book_id: bookId,
      rating,
      emotion,
      favorite,
      parent_memo: memo || null,
    });
    if (recordError) {
      setError(recordError.message);
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

      {step === "no-child" && (
        <div className="mt-8 flex flex-col gap-4">
          <p className="d text-lg">먼저 아이를 등록해 주세요</p>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            기록을 남기려면 아이가 한 명 이상 있어야 해요.
          </p>
          <Link
            href="/more"
            className="d rounded-[14px] py-3 text-center text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            더보기에서 아이 등록하기
          </Link>
        </div>
      )}

      {step === "record" && book && (
        <div className="mt-8 flex flex-col gap-4">
          <div
            className="flex gap-3 rounded-[var(--r)] border p-4"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            {book.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.coverUrl} alt="" className="h-24 w-16 rounded object-cover" />
            )}
            <div>
              <p className="d">{book.title}</p>
              {book.author && (
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {book.author}
                </p>
              )}
              <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
                {book.isNew ? "새로 등록하는 책이에요" : "이미 책장에 있는 책이에요"}
              </p>
            </div>
          </div>

          <div>
            <p className="d text-sm">평점</p>
            <div className="mt-2 flex gap-2">
              {RATINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value === rating ? null : value)}
                  className="d flex h-10 w-10 items-center justify-center rounded-full border text-sm"
                  style={{
                    borderColor: rating === value ? "var(--point)" : "var(--rule)",
                    background: rating === value ? "var(--point)" : "var(--card)",
                    color: rating === value ? "#fff" : "var(--ink)",
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="d text-sm">기분</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEmotion(value === emotion ? null : value)}
                  className="d rounded-full border px-3 py-1.5 text-sm"
                  style={{
                    borderColor: emotion === value ? "var(--point)" : "var(--rule)",
                    background: emotion === value ? "rgba(47,168,79,0.08)" : "var(--card)",
                    color: emotion === value ? "var(--point-deep)" : "var(--ink)",
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <label
            className="flex items-center gap-3 rounded-[var(--r)] border px-4 py-3"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
            />
            <span className="text-sm">가장 좋아하는 책으로 남기기</span>
          </label>

          <textarea
            placeholder="부모 메모 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
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
            disabled={saving}
            onClick={save}
            className="d rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            {saving ? "저장 중..." : "기록 남기기"}
          </button>
        </div>
      )}

      {step === "saved" && (
        <div className="mt-8 flex flex-col gap-4">
          <p className="d text-lg">책장에 기록됐어요!</p>
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
