"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BookFinder from "@/components/book-finder";
import PhotoPicker from "@/components/photo-picker";
import { ensureBook, type BookCandidate } from "@/lib/book-catalog";
import { uploadBookCover } from "@/lib/storage";
import CoverArt from "@/components/cover-art";

// 숲지기 책 상세의 "책 바꾸기": 제목만으로 들어가 표지가 없는 책을
// (1) 검색해서 표지·ISBN이 있는 판으로 갈아 끼우거나 (2) 표지를 직접 찍어 올린다.
// 갈아 끼우기는 이 그룹 목록의 줄(book_list_items)만 새 책으로 바꾸므로
// 연령·설명은 그대로 남고, 다른 그룹·아이들 기록은 건드리지 않는다.
export default function BookSwapEditor({
  itemId,
  groupId,
  bookId,
  hasCover,
}: {
  itemId: string;
  groupId: string;
  bookId: string;
  hasCover: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "swap" | "cover">("closed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  // 검색에서 고른 책은 바로 바꾸지 않고 여기 담아 두었다가 "이 책으로 바꾸기"를 눌러야 저장한다.
  const [picked, setPicked] = useState<BookCandidate | null>(null);

  async function swapTo(candidate: BookCandidate) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const result = await ensureBook(supabase, candidate);
    if ("error" in result) {
      setError(result.error);
      setBusy(false);
      return;
    }
    if (result.id === bookId) {
      setError("지금과 같은 책이에요.");
      setBusy(false);
      return;
    }
    const { error: updateError } = await supabase.from("book_list_items").update({ book_id: result.id }).eq("id", itemId);
    setBusy(false);
    if (updateError) {
      setError(updateError.code === "23505" ? "이미 이 그룹 추천도서에 있는 책이에요." : updateError.message);
      return;
    }
    router.replace(`/teacher/books/${result.id}?group=${groupId}`);
    router.refresh();
  }

  async function saveCover() {
    if (!coverFile || busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요해요.");
      const url = await uploadBookCover(supabase, session.user.id, coverFile);
      const { error: updateError } = await supabase.from("books").update({ cover_url: url }).eq("id", bookId);
      if (updateError) throw updateError;
      setMode("closed");
      setCoverFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "표지를 올리지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "closed") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("swap")}
          className="d rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
        >
          다른 책으로 바꾸기
        </button>
        {!hasCover && (
          <button
            type="button"
            onClick={() => setMode("cover")}
            className="d rounded-full border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
          >
            표지 사진 올리기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-[var(--r)] border p-4" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
      <div className="flex items-center justify-between">
        <p className="d text-sm">{mode === "swap" ? "다른 책으로 바꾸기" : "표지 사진 올리기"}</p>
        <button
          type="button"
          onClick={() => {
            setMode("closed");
            setPicked(null);
            setError(null);
          }}
          className="text-xs"
          style={{ color: "var(--ink-2)" }}
        >
          닫기
        </button>
      </div>
      {mode === "swap" ? (
        <>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            검색해서 표지가 있는 판을 고르면 이 그룹 추천도서의 책만 바뀌어요. 추천 연령·설명은 그대로 남아요.
          </p>
          {picked ? (
            <div className="mt-3">
              <div className="flex items-center gap-3 rounded-[14px] border p-3" style={{ borderColor: "var(--rule)" }}>
                {picked.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={picked.coverUrl} alt="" className="h-16 w-11 flex-none rounded-md object-cover" />
                ) : (
                  <CoverArt title={picked.title} size="sm" className="h-16 w-11 rounded-md" />
                )}
                <div className="min-w-0">
                  <p className="d text-sm leading-snug">{picked.title}</p>
                  {picked.author && (
                    <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                      {picked.author}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPicked(null);
                    setError(null);
                  }}
                  disabled={busy}
                  className="d flex-1 rounded-[14px] border py-2.5 text-sm"
                  style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
                >
                  다시 고르기
                </button>
                <button
                  type="button"
                  onClick={() => swapTo(picked)}
                  disabled={busy}
                  className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
                  style={{ background: "var(--point-deep)" }}
                >
                  {busy ? "저장하는 중…" : "이 책으로 바꾸기"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <BookFinder
                onPick={(c) => {
                  setPicked(c);
                  setError(null);
                }}
                placeholder="바꿀 책 제목으로 검색"
              />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            검색에 안 나오는 책은 표지를 찍어 올려요. 이 책을 쓰는 모든 화면에 보여요.
          </p>
          <div className="mt-3">
            <PhotoPicker label="표지 찍어 올리기" onSelect={setCoverFile} />
          </div>
          <button
            type="button"
            onClick={saveCover}
            disabled={!coverFile || busy}
            className="d mt-3 w-full rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point-deep)" }}
          >
            {busy ? "올리는 중…" : "표지 저장"}
          </button>
        </>
      )}
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
