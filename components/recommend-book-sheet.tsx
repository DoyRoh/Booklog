"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setShelved } from "@/lib/quick-read";
import { categoryColor } from "@/lib/categories";
import { ageBandsLabel } from "@/lib/age-bands";
import type { RecommendBook } from "@/lib/recommend-books";

const STATUS_TEXT = { want: "읽고 싶은 책으로 책장에 있어요", reading: "읽는 중인 책이에요", done: "다 읽은 책이에요" } as const;

// 추천도서를 누르면 바로 기록 화면으로 가지 않고 이 창이 먼저 뜬다(사용자 요청) --
// 숲지기가 붙인 분야·추천 나이·추천 메모를 보고, 아래에서 "기록 남기기"로 가거나
// "읽고 싶은 책으로 꽂기"로 책장에 담는다.
export default function RecommendBookSheet({
  book,
  groupId,
  activeChildId,
  onClose,
}: {
  book: RecommendBook;
  groupId: string;
  activeChildId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(book.readStatus);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const href = `/library/add?bookId=${encodeURIComponent(book.bookId)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(groupId)}`;

  async function shelve() {
    if (!activeChildId || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    await setShelved(createClient(), activeChildId, book.bookId, groupId, true);
    setStatus("want");
    setBusy(false);
    busyRef.current = false;
    router.refresh();
  }

  async function unshelve() {
    if (!activeChildId || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    await setShelved(createClient(), activeChildId, book.bookId, groupId, false);
    setStatus(null);
    setBusy(false);
    busyRef.current = false;
    router.refresh();
  }

  const hasInfo = book.categories.length > 0 || book.ageBands.length > 0;

  return (
    <div
      className="backdrop-in fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(38,54,43,0.45)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={book.title}
        className="sheet-up max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] p-5 pb-8 sm:rounded-[24px]"
        style={{ background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="text-sm" style={{ color: "var(--ink-2)" }}>
            닫기
          </button>
        </div>

        <div className="mt-1 flex gap-4">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt="" className="h-[120px] w-[88px] flex-none rounded-[8px] object-cover" style={{ boxShadow: "0 4px 8px rgba(38,54,43,0.2)" }} />
          ) : (
            <div className="h-[120px] w-[88px] flex-none rounded-[8px]" style={{ background: "var(--paper)" }} />
          )}
          <div className="min-w-0 flex-1">
            <p className="d text-lg leading-snug" style={{ overflowWrap: "anywhere" }}>
              {book.title}
            </p>
            {book.author && (
              <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
                {book.author}
              </p>
            )}
            {hasInfo && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {book.categories.map((c) => (
                  <span key={c} className="rounded-full px-2.5 py-0.5 text-xs text-white" style={{ background: categoryColor(c) }}>
                    {c}
                  </span>
                ))}
                {book.ageBands.length > 0 && (
                  <span className="rounded-full border px-2.5 py-0.5 text-xs" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>
                    {ageBandsLabel(book.ageBands)} 추천
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-[14px] p-4" style={{ background: "var(--paper)" }}>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            숲지기의 추천 메모
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed" style={{ color: book.note ? "var(--ink)" : "var(--ink-2)" }}>
            {book.note ?? "아직 적어 둔 메모가 없어요."}
          </p>
        </div>

        {status && (
          <p className="mt-4 text-center text-xs" style={{ color: "var(--point-deep)" }}>
            {STATUS_TEXT[status]}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <Link
            href={href}
            className="d flex-1 rounded-[14px] py-3 text-center text-sm text-white"
            style={{ background: "var(--point-deep)" }}
          >
            기록 남기기
          </Link>
          {activeChildId &&
            (status === null ? (
              <button
                type="button"
                onClick={shelve}
                disabled={busy}
                className="d flex-1 rounded-[14px] border py-3 text-sm disabled:opacity-50"
                style={{ borderColor: "var(--point-deep)", color: "var(--point-deep)" }}
              >
                {busy ? "꽂는 중…" : "읽고 싶은 책으로 꽂기"}
              </button>
            ) : status === "want" ? (
              <button
                type="button"
                onClick={unshelve}
                disabled={busy}
                className="d flex-1 rounded-[14px] border py-3 text-sm disabled:opacity-50"
                style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
              >
                {busy ? "빼는 중…" : "책장에서 빼기"}
              </button>
            ) : null)}
        </div>
      </div>
    </div>
  );
}
