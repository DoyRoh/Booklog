"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getActiveChild } from "@/lib/active-child";
import { hasVoiceConsent } from "@/lib/consent";
import { uploadChildPhoto, uploadChildVoice } from "@/lib/storage";
import BarcodeScanner from "@/components/barcode-scanner";
import PhotoPicker from "@/components/photo-picker";
import VoiceRecorder from "@/components/voice-recorder";
import QuestionPrompt from "@/components/question-prompt";
import RatingPicker from "@/components/rating-picker";
import ReadDatePicker from "@/components/read-date-picker";

type Step = "form" | "no-child" | "saved";
type FindMode = "none" | "scan" | "isbn";

type Candidate = {
  title: string;
  author: string;
  publisher: string;
  coverUrl: string | null;
  introduction: string;
  publishDate: string | null;
  isbn: string;
};

type ReadingStatus = "want" | "reading" | "done";

const EMOTIONS = ["재밌어요", "웃겼어요", "감동적이에요", "슬퍼요", "그저그래요"];
const STATUS_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶어요",
  reading: "읽는 중이에요",
  done: "다 읽었어요",
};
const SAVE_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶은 책으로 저장",
  reading: "읽는 중으로 저장",
  done: "기록 남기기",
};

export default function AddBookPage() {
  return (
    <Suspense fallback={null}>
      <AddBookForm />
    </Suspense>
  );
}

function AddBookForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("form");

  // 지금 기록 중인 책 -- 검색으로 채워지든, 바코드/ISBN 조회로 채워지든,
  // 그냥 직접 타이핑하든, 오늘 탭 숙제 책 클릭으로 넘어오든 항상 이
  // 필드들이 저장의 기준이다.
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [introduction, setIntroduction] = useState("");
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [isbn, setIsbn] = useState("");
  const [bookId, setBookId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const lastResolvedTitle = useRef("");

  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [findMode, setFindMode] = useState<FindMode>("none");
  const [manualIsbn, setManualIsbn] = useState("");
  const [isbnLookingUp, setIsbnLookingUp] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<ReadingStatus>("done");
  const [readDate, setReadDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState<number | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [pagesRead, setPagesRead] = useState("");
  const [memo, setMemo] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceAllowed, setVoiceAllowed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      hasVoiceConsent(supabase, user.id).then(setVoiceAllowed);
    });
  }, []);

  // 오늘 탭 숙제 책의 "기록하기"로 넘어온 경우, 검색을 다시 거칠 필요
  // 없이 그 책 정보로 곧장 채워둔다.
  useEffect(() => {
    const prefTitle = searchParams.get("title");
    if (!prefTitle) return;
    lastResolvedTitle.current = prefTitle;
    // 마운트 시 URL 쿼리로 넘어온 책 정보를 한 번만 반영한다(검색
    // 입력창의 로컬 state로는 서버 렌더 시점에 채울 수 없다).
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(prefTitle);
    setAuthor(searchParams.get("author") ?? "");
    setCoverUrl(searchParams.get("cover") || null);
    setBookId(searchParams.get("bookId") || null);
    setGroupId(searchParams.get("groupId") || null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 책 제목을 입력할 때마다(2글자 이상) 카카오 키워드 검색으로 후보를
  // 찾아 입력창 아래 드롭다운으로 보여준다 -- 별도 "검색 화면"을 거치지
  // 않고 기록 남기기 화면 안에서 바로 찾을 수 있게 하기 위함이다.
  useEffect(() => {
    const q = title.trim();
    if (q.length < 2 || q === lastResolvedTitle.current) {
      setCandidates(null);
      setDropdownOpen(false);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/books/lookup?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok) {
          setCandidates(data.results ?? []);
          setDropdownOpen(true);
        }
      } catch {
        // 자동완성 실패는 조용히 무시 -- 사용자는 그냥 직접 입력을 이어가면 된다.
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(handle);
  }, [title]);

  async function findExistingByIsbn(supabase: ReturnType<typeof createClient>, value: string) {
    const { data: existingIsbn } = await supabase
      .from("book_isbns")
      .select("book_id, books(title, author, publisher, cover_url)")
      .eq("isbn", value)
      .maybeSingle();
    if (!existingIsbn?.books) return null;
    const existingBook = existingIsbn.books as unknown as {
      title: string;
      author: string | null;
      publisher: string | null;
      cover_url: string | null;
    };
    return {
      bookId: existingIsbn.book_id as string,
      title: existingBook.title,
      author: existingBook.author ?? "",
      publisher: existingBook.publisher ?? "",
      coverUrl: existingBook.cover_url,
      introduction: "",
      publishDate: null,
      isbn: value,
    };
  }

  function applyResolved(resolved: {
    bookId: string | null;
    title: string;
    author: string;
    publisher: string;
    coverUrl: string | null;
    introduction: string;
    publishDate: string | null;
    isbn: string;
  }) {
    lastResolvedTitle.current = resolved.title;
    setTitle(resolved.title);
    setAuthor(resolved.author);
    setPublisher(resolved.publisher);
    setCoverUrl(resolved.coverUrl);
    setIntroduction(resolved.introduction);
    setPublishDate(resolved.publishDate);
    setIsbn(resolved.isbn);
    setBookId(resolved.bookId);
    setCandidates(null);
    setDropdownOpen(false);
  }

  async function selectCandidate(candidate: Candidate) {
    setError(null);
    const supabase = createClient();
    if (candidate.isbn) {
      const existing = await findExistingByIsbn(supabase, candidate.isbn);
      if (existing) {
        applyResolved(existing);
        return;
      }
    }
    applyResolved({ ...candidate, bookId: null });
  }

  async function lookupByIsbn(value: string) {
    setError(null);
    setIsbnLookingUp(true);
    const supabase = createClient();

    const existing = await findExistingByIsbn(supabase, value);
    if (existing) {
      applyResolved(existing);
      setIsbnLookingUp(false);
      setFindMode("none");
      return;
    }

    try {
      const res = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "책을 찾지 못했어요.");
        setIsbnLookingUp(false);
        return;
      }
      applyResolved({ ...data, bookId: null, isbn: data.isbn || value });
    } catch {
      setError("책 정보를 불러오는 중 문제가 생겼어요.");
    }
    setIsbnLookingUp(false);
    setFindMode("none");
  }

  async function save() {
    if (!title.trim()) return;
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

    let finalBookId = bookId;
    if (!finalBookId) {
      finalBookId = crypto.randomUUID();
      const { error: bookError } = await supabase.from("books").insert({
        id: finalBookId,
        title: title.trim(),
        author: author.trim() || null,
        publisher: publisher.trim() || null,
        cover_url: coverUrl,
        introduction: introduction || null,
        publish_date: publishDate,
        source: isbn ? "kakao" : "manual",
      });
      if (bookError) {
        setError(bookError.message);
        setSaving(false);
        return;
      }

      // ISBN 없이 등록한 책(오래된 책, 수제책 등)은 book_isbns에 남길 게 없다.
      if (isbn) {
        const { error: isbnError } = await supabase
          .from("book_isbns")
          .insert({ book_id: finalBookId, isbn });
        if (isbnError) {
          setError(isbnError.message);
          setSaving(false);
          return;
        }
      }
    }

    let photoUrl: string | null = null;
    let voiceUrl: string | null = null;
    try {
      if (photoFile) photoUrl = await uploadChildPhoto(supabase, activeChild.id, photoFile);
      if (voiceBlob) voiceUrl = await uploadChildVoice(supabase, activeChild.id, voiceBlob);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "사진/음성 업로드에 실패했어요.");
      setSaving(false);
      return;
    }

    const { error: recordError } = await supabase.from("reading_records").insert({
      child_id: activeChild.id,
      book_id: finalBookId,
      group_id: groupId,
      status,
      read_date: readDate,
      rating,
      emotion,
      favorite,
      pages_read: status === "reading" && pagesRead ? Number(pagesRead) : null,
      parent_memo: memo || null,
      photo_url: photoUrl,
      voice_url: voiceUrl,
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
        <h1 className="d text-xl">기록 남기기</h1>
        <Link href="/library" className="text-sm" style={{ color: "var(--ink-2)" }}>
          닫기
        </Link>
      </div>

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
            아이 등록하러 가기
          </Link>
        </div>
      )}

      {step === "form" && (
        <div className="mt-6 flex flex-col gap-4">
          <div>
            <p className="d text-sm">무슨 책을 읽었어?</p>
            <div className="relative mt-2">
              <input
                type="text"
                placeholder="책 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[14px] border px-4 py-3 text-sm outline-none"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              />
              {dropdownOpen && candidates && candidates.length > 0 && (
                <div
                  className="absolute inset-x-0 top-[calc(100%+4px)] z-10 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-[14px] border p-1.5"
                  style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                >
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.isbn || candidate.title}
                      type="button"
                      onClick={() => selectCandidate(candidate)}
                      className="flex items-center gap-3 rounded-[10px] p-1.5 text-left"
                    >
                      {candidate.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={candidate.coverUrl}
                          alt=""
                          className="h-12 w-9 flex-none rounded object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm">{candidate.title}</p>
                        {candidate.author && (
                          <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                            {candidate.author}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {dropdownOpen && candidates && candidates.length === 0 && !searching && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--ink-2)" }}>
                  검색 결과가 없어요. 이 제목 그대로 기록해도 괜찮아요.
                </p>
              )}
            </div>

            <input
              type="text"
              placeholder="지은이 (선택)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="mt-2 w-full rounded-[14px] border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            />

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setFindMode(findMode === "scan" ? "none" : "scan")}
                className="d text-xs"
                style={{ color: findMode === "scan" ? "var(--point-deep)" : "var(--point)" }}
              >
                바코드로 찾기
              </button>
              <button
                type="button"
                onClick={() => setFindMode(findMode === "isbn" ? "none" : "isbn")}
                className="d text-xs"
                style={{ color: findMode === "isbn" ? "var(--point-deep)" : "var(--point)" }}
              >
                ISBN으로 찾기
              </button>
            </div>

            {findMode === "scan" && (
              <div className="mt-2">
                <BarcodeScanner
                  onDetected={(value) => lookupByIsbn(value)}
                  onError={(message) => setError(message)}
                />
                <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
                  책 뒷면 바코드를 화면 안에 맞춰주세요.
                </p>
              </div>
            )}

            {findMode === "isbn" && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ISBN 13자리"
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value.replace(/[^\d]/g, ""))}
                  className="flex-1 rounded-[14px] border px-4 py-3 text-sm outline-none"
                  style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                />
                <button
                  type="button"
                  disabled={
                    (manualIsbn.length !== 10 && manualIsbn.length !== 13) || isbnLookingUp
                  }
                  onClick={() => lookupByIsbn(manualIsbn)}
                  className="d rounded-[14px] px-4 py-3 text-sm text-white disabled:opacity-40"
                  style={{ background: "var(--point)" }}
                >
                  {isbnLookingUp ? "조회 중" : "조회"}
                </button>
              </div>
            )}

            {title.trim() && (
              <div
                className="mt-3 flex items-center gap-3 rounded-[var(--r)] border p-3"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" className="h-16 w-11 flex-none rounded object-cover" />
                ) : (
                  <div
                    className="h-16 w-11 flex-none rounded"
                    style={{ background: "var(--paper)" }}
                  />
                )}
                <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {bookId ? "이미 책장에 있는 책이에요" : "새로 등록하는 책이에요"}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="d text-sm">지금 상태</p>
            <div className="mt-2 flex gap-2">
              {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className="d flex-1 rounded-[14px] border py-2.5 text-sm"
                  style={{
                    borderColor: status === value ? "var(--point)" : "var(--rule)",
                    background: status === value ? "rgba(47,168,79,0.08)" : "var(--card)",
                    color: status === value ? "var(--point-deep)" : "var(--ink)",
                  }}
                >
                  {STATUS_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <ReadDatePicker value={readDate} onChange={setReadDate} />

          {status === "reading" && (
            <div>
              <p className="d text-sm">몇 쪽까지 읽었어? (선택)</p>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="예: 35"
                value={pagesRead}
                onChange={(e) => setPagesRead(e.target.value)}
                className="mt-2 w-full rounded-[14px] border px-4 py-3 text-sm outline-none"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              />
            </div>
          )}

          {status !== "done" && (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              평점·기분 같은 나머지 기록은 다 읽고 나서 채워도 괜찮아요.
            </p>
          )}

          <div>
            <p className="d text-sm">재미있었어?</p>
            <div className="mt-2">
              <RatingPicker value={rating} onChange={setRating} />
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
            <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
            <span className="text-sm">가장 좋아하는 책으로 남기기</span>
          </label>

          <QuestionPrompt />

          <textarea
            placeholder="부모 메모 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="rounded-[14px] border px-4 py-3 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />

          <div>
            <p className="d text-sm">사진 (선택)</p>
            <div className="mt-2">
              <PhotoPicker onSelect={setPhotoFile} />
            </div>
          </div>

          {voiceAllowed && (
            <div>
              <p className="d text-sm">음성 기록 (선택)</p>
              <div className="mt-2">
                <VoiceRecorder onRecorded={setVoiceBlob} onClear={() => setVoiceBlob(null)} label="음성 기록" />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={save}
            className="d rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            {saving ? "저장 중..." : SAVE_LABELS[status]}
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
