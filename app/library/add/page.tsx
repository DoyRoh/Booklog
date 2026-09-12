"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getActiveChild } from "@/lib/active-child";
import { AvatarIllustration, PawStamp, type Avatar } from "@/components/illustration";
import { hasVoiceConsent } from "@/lib/consent";
import { uploadBookCover, uploadChildPhoto, uploadChildVoice } from "@/lib/storage";
import BarcodeScanner from "@/components/barcode-scanner";
import PhotoPicker from "@/components/photo-picker";
import VoiceRecorder from "@/components/voice-recorder";
import QuestionPrompt from "@/components/question-prompt";
import RatingPicker from "@/components/rating-picker";
import ReadDatePicker from "@/components/read-date-picker";
import ShelfTagPicker from "@/components/shelf-tag-picker";
import { kstDate } from "@/lib/kst";

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
  // saving 상태(state)만으로 저장 버튼을 막으면, React가 리렌더링해서
  // 버튼이 실제로 disabled되기 전까지의 짧은 틈에 빠르게 두 번 탭하면
  // save()가 두 번 다 실행돼 기록이 중복 저장될 수 있다(아이가 화면을
  // 여러 번 두드리는 경우 특히). ref는 즉시(동기적으로) 갱신되므로 이
  // 틈을 막는다.
  const savingRef = useRef(false);

  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [findMode, setFindMode] = useState<FindMode>("none");
  const [manualIsbn, setManualIsbn] = useState("");
  const [isbnLookingUp, setIsbnLookingUp] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<ReadingStatus>("done");
  const [readDate, setReadDate] = useState(() => kstDate());
  const [rating, setRating] = useState<number | null>(null);
  // 기본 화면엔 제목·상태·날짜·평점·저장만 두고, 나머지(책장·즐겨찾기·
  // 메모·사진·목소리)는 "더 남기기"를 눌렀을 때만 펼친다 -- 30초 기록이
  // 목표인데 첫 화면이 길면 기록 자체를 안 하게 된다.
  const [more, setMore] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [pagesRead, setPagesRead] = useState("");
  const [memo, setMemo] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceAllowed, setVoiceAllowed] = useState(false);
  const [childName, setChildName] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  // 이 아이의 책장에 같은 책 기록이 몇 개 있는지. 카탈로그(book_isbns)에 있는
  // 것과 "내 책장에 있는 것"은 다르다 -- 예전엔 카탈로그에만 있어도 "이미
  // 책장에 있는 책"이라고 잘못 말했다.
  const [shelfCount, setShelfCount] = useState<number | null>(null);
  const [childAvatar, setChildAvatar] = useState<Avatar | null>(null);
  const [shelfTagId, setShelfTagId] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      hasVoiceConsent(supabase, user.id).then(setVoiceAllowed);
      getActiveChild(supabase, user.id).then((child) => {
        setChildName(child?.name ?? null);
        setChildId(child?.id ?? null);
        setChildAvatar(child?.avatar ?? null);
      });
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bookId || !childId) {
        await Promise.resolve();
        if (!cancelled) setShelfCount(null);
        return;
      }
      const supabase = createClient();
      const { count } = await supabase
        .from("reading_records")
        .select("id", { count: "exact", head: true })
        .eq("child_id", childId)
        .eq("book_id", bookId);
      if (!cancelled) setShelfCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, childId]);

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

  // 전권 세트처럼 카카오 검색에 표지가 없는 책(ISBN 검색 자체가 안 되는
  // 경우가 많음)을 직접 찍어 올린다. 새로 등록하는 책(!bookId)일 때만
  // 의미가 있다 -- 이미 카탈로그에 있는 책의 표지는 여기서 바꿔도 그
  // 책 자체(books.cover_url)에는 반영되지 않는다.
  async function pickCoverPhoto(file: File | null) {
    if (!file) {
      setCoverUrl(null);
      return;
    }
    setCoverUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요해요.");
      const url = await uploadBookCover(supabase, user.id, file);
      setCoverUrl(url);
    } catch {
      setError("표지 사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    setCoverUploading(false);
  }

  async function save() {
    if (!title.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("로그인 정보를 확인할 수 없어요.");
        return;
      }

      const activeChild = await getActiveChild(supabase, user.id);
      if (!activeChild) {
        setStep("no-child");
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
          return;
        }

        // ISBN 없이 등록한 책(오래된 책, 수제책 등)은 book_isbns에 남길 게 없다.
        if (isbn) {
          const { error: isbnError } = await supabase
            .from("book_isbns")
            .insert({ book_id: finalBookId, isbn });
          if (isbnError) {
            setError(isbnError.message);
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
        return;
      }

      const { error: recordError } = await supabase.from("reading_records").insert({
        child_id: activeChild.id,
        book_id: finalBookId,
        group_id: groupId,
        status,
        read_date: readDate,
        rating,
        favorite,
        pages_read: status === "reading" && pagesRead ? Number(pagesRead) : null,
        parent_memo: memo || null,
        photo_url: photoUrl,
        voice_url: voiceUrl,
        shelf_tag_id: shelfTagId,
      });
      if (recordError) {
        setError(recordError.message);
        return;
      }

      setStep("saved");
      // 폼을 한참 내려 놓은 채 저장하면 발자국 도장 화면이 스크롤 위로
      // 올라가 안 보인다(사용자 지적) -- 맨 위로 올려 준다.
      window.scrollTo({ top: 0, behavior: "auto" });
      // 숙제 책을 이 화면에서 처음 기록했을 수도 있으니, 하단 탭의 숙제
      // 알림 점이 다음 화면 전환까지 기다리지 않고 바로 갱신되게 한다.
      window.dispatchEvent(new Event("chaeksup:assignment-changed"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col px-5 pt-[20px] pb-[16px]">
      <div className="flex items-center justify-between">
        <h1 className="d text-xl">기록 남기기</h1>
        <Link href="/library" className="text-sm" style={{ color: "var(--ink-2)" }}>
          닫기
        </Link>
      </div>

      {step === "no-child" && (
        <div className="mt-8 flex flex-col gap-4">
          <p className="d text-base">먼저 아이를 등록해 주세요</p>
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
                  className="min-w-0 flex-1 rounded-[14px] border px-4 py-3 text-sm outline-none"
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
                  {!bookId
                    ? "새로 등록하는 책이에요"
                    : shelfCount && shelfCount > 0
                      ? `이미 내 책장에 있는 책이에요 · 기록이 하나 더 남아요`
                      : "책 정보를 찾았어요"}
                </p>
              </div>
            )}

            {/* 전권 세트처럼 ISBN 검색으로 표지를 못 찾은, 새로 등록하는
                책만 사진으로 표지를 직접 올릴 수 있게 한다. ISBN으로 이미
                찾아진 책(=카카오 표지가 이미 있음)은 굳이 바꿀 필요가
                없어서 이 UI 자체를 안 보여준다. */}
            {!bookId && !isbn && title.trim() && (
              <div className="mt-2">
                <PhotoPicker
                  onSelect={pickCoverPhoto}
                  existingUrl={coverUrl}
                  onRemoveExisting={() => setCoverUrl(null)}
                  label={coverUploading ? "표지 올리는 중..." : "표지 사진 찍어 올리기 (선택)"}
                />
              </div>
            )}
          </div>

          <div className="mx-1" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />

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

          <ReadDatePicker
            value={readDate}
            onChange={setReadDate}
            disabled={status === "want"}
            disabledHint="다 읽고 나서 골라요"
          />

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

          <div className="mx-1" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />

          <div>
            <p className="d text-sm">재미있었어?</p>
            <div className="mt-2">
              <RatingPicker value={rating} onChange={setRating} />
            </div>
            {status !== "done" && (
              <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
                다 읽고 나서 골라도 괜찮아요.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="d flex items-center justify-between rounded-[14px] border px-4 py-3 text-sm"
            style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
          >
            <span>{more ? "간단히" : "더 남기기"}</span>
            <span className="text-xs font-normal">책장 · 메모 · 사진 · 목소리</span>
          </button>

          {more && (
            <>
              {childId && <ShelfTagPicker childId={childId} value={shelfTagId} onChange={setShelfTagId} />}

              <label
                className="flex items-center gap-3 rounded-[var(--r)] border px-4 py-3"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
                <span className="text-sm">가장 좋아하는 책으로 남기기</span>
              </label>

              <QuestionPrompt answer={memo} onAnswerChange={setMemo} />

              <div
                className="rounded-[var(--r)] border p-4"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                <p className="d text-base">{childName ? `${childName}의 기록` : "우리 아이의 기록"}</p>

                <div className="mt-3">
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    인상 깊었던 장면을 사진으로 남겨보세요
                  </p>
                  <div className="mt-2">
                    <PhotoPicker onSelect={setPhotoFile} label="장면 찍어 담기" />
                  </div>
                </div>

                {voiceAllowed && (
                  <>
                    <div className="mx-0 mt-4" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />
                    <div className="mt-4">
                      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                        오늘 읽은 소감을 목소리로 남겨보세요
                      </p>
                      <div className="mt-2">
                        <VoiceRecorder
                          onRecorded={setVoiceBlob}
                          onClear={() => setVoiceBlob(null)}
                          label={childName ? `${childName}의 목소리로 남기기` : "목소리로 남기기"}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
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
          {/* 다 읽은 책이면 아이 아바타의 발자국 도장이 "쾅" 찍힌다(탐험
              수첩 모티프). 아직 안 읽은/읽는 중인 책은 아바타가 책을 안고
              책장에 꽂아 두는 느낌으로. */}
          <div className="flex items-center gap-4">
            {status === "done" ? (
              <PawStamp avatar={childAvatar} height={96} className="paw-stamp flex-none" />
            ) : (
              <AvatarIllustration avatar={childAvatar} height={96} className="flex-none" />
            )}
            <p className="hand text-2xl" style={{ color: "var(--point-deep)" }}>
              {status === "done" ? "발자국을 남겼어요!" : "책장에 꽂아 뒀어요!"}
            </p>
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
    </div>
  );
}
