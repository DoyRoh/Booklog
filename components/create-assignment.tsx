"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getQuestions, addQuestion, type BookQuestion } from "@/lib/questions";
import { ensureBook, type BookCandidate } from "@/lib/book-catalog";
import { kstDate } from "@/lib/kst";
import BookFinder from "@/components/book-finder";

type BookOption = { id: string; title: string; author?: string | null; coverUrl?: string | null };
/** 숙제에 넣기로 고른 책(찾아 넣었든 추천도서에서 골랐든). */
type DraftBook = { id: string; title: string; author: string | null; coverUrl: string | null };
type MissionType = "question" | "voice";
type DraftMission = { type: MissionType; question: string };

const MISSION_LABELS: Record<MissionType, string> = {
  question: "질문에 답하기",
  voice: "소리 내어 읽기 녹음",
};

export default function CreateAssignment({
  groupId,
  books,
  defaultOpen = false,
  afterSaveHref,
  cancelHref,
}: {
  groupId: string;
  /** 이 그룹의 추천도서 -- "추천도서에서 고르기"로 바로 넣을 수 있는 후보. */
  books: BookOption[];
  /** 전용 화면(/teacher/assignments/new)에서는 처음부터 폼이 펼쳐진다. */
  defaultOpen?: boolean;
  /** 저장 뒤 이동할 곳(없으면 제자리에서 접힘). */
  afterSaveHref?: string;
  /** 취소 시 이동할 곳(없으면 제자리에서 접힘). */
  cancelHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // 시작일은 따로 받지 않는다 -- 숙제를 낸 날(등록일)이 시작일이고, 부모가
  // 알아야 할 건 "언제까지"뿐이다. 비워 두면 일주일(lib/assignment-period).
  const [endDate, setEndDate] = useState("");
  // 읽을 책은 숲지기가 직접 찾아 넣는다(제목 검색·바코드·ISBN). 추천도서
  // 목록에서 골라 넣을 수도 있지만 거기에 먼저 올려 둘 필요는 없다.
  const [draftBooks, setDraftBooks] = useState<DraftBook[]>([]);
  const [finderOpen, setFinderOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingBook, setAddingBook] = useState(false);
  // 선택된 책마다 "몇 쪽까지가 숙제인지" 텍스트 입력값을 따로 들고 있는다 --
  // 비어 있으면 완독이 기준이다.
  const [targetPages, setTargetPages] = useState<Record<string, string>>({});
  const [missions, setMissions] = useState<DraftMission[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankQuestions, setBankQuestions] = useState<BookQuestion[]>([]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    getQuestions(supabase).then(setBankQuestions);
  }, [open]);

  function addDraft(book: DraftBook) {
    setDraftBooks((prev) => (prev.some((b) => b.id === book.id) ? prev : [...prev, book]));
  }

  function removeDraft(id: string) {
    setDraftBooks((prev) => prev.filter((b) => b.id !== id));
    setTargetPages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // 검색·스캔으로 고른 후보를 카탈로그 행으로 바꾼 뒤 숙제 책에 넣는다.
  async function pickFound(candidate: BookCandidate) {
    setAddingBook(true);
    setError(null);
    const ensured = await ensureBook(createClient(), candidate);
    setAddingBook(false);
    if ("error" in ensured) {
      setError(ensured.error);
      return;
    }
    addDraft({ id: ensured.id, title: candidate.title, author: candidate.author || null, coverUrl: candidate.coverUrl });
    setFinderOpen(false);
  }

  function addMission(type: MissionType) {
    setMissions((prev) => [...prev, { type, question: "" }]);
  }

  function updateMissionQuestion(index: number, question: string) {
    setMissions((prev) => prev.map((m, i) => (i === index ? { ...m, question } : m)));
  }

  function removeMission(index: number) {
    setMissions((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setTitle("");
    setDescription("");
    setEndDate("");
    setDraftBooks([]);
    setFinderOpen(false);
    setPickerOpen(false);
    setTargetPages({});
    setMissions([]);
    setError(null);
  }

  async function submit() {
    if (!title.trim() || draftBooks.length === 0) return;
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

    const assignmentId = crypto.randomUUID();
    const { error: assignmentError } = await supabase.from("assignments").insert({
      id: assignmentId,
      group_id: groupId,
      title: title.trim(),
      description: description.trim() || null,
      // 등록일 = 시작일. 화면에서 "언제 냈는지"는 이 값으로 보여준다.
      start_date: kstDate(),
      end_date: endDate || null,
      created_by: user.id,
    });
    if (assignmentError) {
      setError(assignmentError.message);
      setSaving(false);
      return;
    }

    const { error: booksError } = await supabase.from("assignment_books").insert(
      draftBooks.map((book) => ({
        assignment_id: assignmentId,
        book_id: book.id,
        required: true,
        target_page: targetPages[book.id] ? Number(targetPages[book.id]) : null,
      }))
    );
    if (booksError) {
      setError(booksError.message);
      setSaving(false);
      return;
    }

    const validMissions = missions.filter((m) => m.type !== "question" || m.question.trim());
    if (validMissions.length > 0) {
      const { error: missionsError } = await supabase.from("assignment_missions").insert(
        validMissions.map((m) => ({
          assignment_id: assignmentId,
          type: m.type,
          question: m.type === "question" ? m.question.trim() : null,
          required: true,
        }))
      );
      if (missionsError) {
        setError(missionsError.message);
        setSaving(false);
        return;
      }

      // 교사가 직접 쓴 새 질문은 다른 교사도 다음에 골라 쓸 수 있게 질문
      // 은행에 조용히 추가한다(이미 있는 질문이면 건너뜀, 실패해도 숙제
      // 생성 자체는 이미 끝났으니 막지 않는다).
      const bankTexts = new Set(bankQuestions.map((q) => q.text));
      for (const mission of validMissions) {
        if (mission.type === "question" && !bankTexts.has(mission.question.trim())) {
          try {
            await addQuestion(supabase, user.id, mission.question);
          } catch {
            // best-effort
          }
        }
      }
    }

    setSaving(false);
    reset();
    if (afterSaveHref) {
      router.push(afterSaveHref);
      router.refresh();
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="d w-full rounded-[14px] border border-dashed px-4 py-3 text-sm"
        style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
      >
        + 새 숙제 만들기
      </button>
    );
  }

  return (
    <div>
      <input
        type="text"
        placeholder="숙제 제목 (예: 이번 주 숲 탐험)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-3 w-full rounded-[14px] border px-4 py-2.5 text-sm outline-none"
        style={{ borderColor: "var(--rule)" }}
      />
      <textarea
        placeholder="안내 문구 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded-[14px] border px-4 py-2.5 text-sm outline-none"
        style={{ borderColor: "var(--rule)" }}
      />

      <label className="mt-3 block">
        <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
          언제까지 (선택)
        </span>
        <input
          type="date"
          value={endDate}
          min={kstDate()}
          onChange={(e) => setEndDate(e.target.value)}
          className="mt-1 w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--rule)" }}
        />
        <span className="mt-1 block text-xs" style={{ color: "var(--ink-2)" }}>
          비워 두면 오늘부터 일주일이에요. 낸 날짜는 자동으로 남아요.
        </span>
      </label>

      <p className="d mt-4 text-xs" style={{ color: "var(--ink-2)" }}>
        읽을 책
      </p>
      {draftBooks.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {draftBooks.map((book) => (
            <div key={book.id} className="rounded-[10px] border px-3 py-2" style={{ borderColor: "var(--rule)" }}>
              <div className="flex items-center gap-2">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" className="h-10 w-7 flex-none rounded object-cover" />
                ) : (
                  <span className="h-10 w-7 flex-none rounded" style={{ background: "var(--paper)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{book.title}</p>
                  {book.author && (
                    <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                      {book.author}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeDraft(book.id)}
                  className="flex-none text-xs"
                  style={{ color: "var(--berry)" }}
                >
                  빼기
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-9">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="완독"
                  value={targetPages[book.id] ?? ""}
                  onChange={(e) => setTargetPages((prev) => ({ ...prev, [book.id]: e.target.value }))}
                  className="w-20 rounded-[8px] border px-2 py-1.5 text-xs outline-none"
                  style={{ borderColor: "var(--rule)" }}
                />
                <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                  쪽까지 (비워두면 완독이 기준)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {finderOpen ? (
        <div className="mt-2 rounded-[10px] border p-3" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-center justify-between">
            <span className="d text-xs" style={{ color: "var(--point-deep)" }}>
              {addingBook ? "책 넣는 중…" : "책 찾기"}
            </span>
            <button type="button" onClick={() => setFinderOpen(false)} className="text-xs" style={{ color: "var(--ink-2)" }}>
              닫기
            </button>
          </div>
          <div className="mt-2">
            <BookFinder onPick={pickFound} />
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setFinderOpen(true);
              setPickerOpen(false);
            }}
            className="d flex-1 rounded-[10px] border border-dashed py-2 text-xs"
            style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
          >
            + 책 찾아 넣기
          </button>
          {books.length > 0 && (
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="d flex-1 rounded-[10px] border border-dashed py-2 text-xs"
              style={{
                borderColor: pickerOpen ? "var(--point)" : "var(--rule)",
                color: "var(--point-deep)",
              }}
            >
              추천도서에서 고르기
            </button>
          )}
        </div>
      )}

      {pickerOpen && !finderOpen && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-[10px] border p-2" style={{ borderColor: "var(--rule)" }}>
          {books.map((book) => {
            const selected = draftBooks.some((b) => b.id === book.id);
            return (
              <label key={book.id} className="flex items-center gap-2 px-1 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() =>
                    selected
                      ? removeDraft(book.id)
                      : addDraft({ id: book.id, title: book.title, author: book.author ?? null, coverUrl: book.coverUrl ?? null })
                  }
                />
                {book.title}
              </label>
            );
          })}
        </div>
      )}

      <p className="d mt-4 text-xs" style={{ color: "var(--ink-2)" }}>
        추가 미션 (선택)
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {missions.map((mission, index) => (
          <div key={index} className="rounded-[10px] border p-2.5" style={{ borderColor: "var(--rule)" }}>
            <div className="flex items-center justify-between">
              <span className="d text-xs" style={{ color: "var(--point-deep)" }}>
                {MISSION_LABELS[mission.type]}
              </span>
              <button
                type="button"
                onClick={() => removeMission(index)}
                className="text-xs"
                style={{ color: "var(--berry)" }}
              >
                삭제
              </button>
            </div>
            {mission.type === "question" && (
              <>
                <input
                  type="text"
                  placeholder="질문 내용"
                  value={mission.question}
                  onChange={(e) => updateMissionQuestion(index, e.target.value)}
                  className="mt-2 w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--rule)" }}
                />
                {bankQuestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {bankQuestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => updateMissionQuestion(index, q.text)}
                        className="rounded-full border px-2.5 py-1 text-xs"
                        style={{
                          borderColor: mission.question === q.text ? "var(--point)" : "var(--rule)",
                          background: mission.question === q.text ? "rgba(47,168,79,0.08)" : "transparent",
                          color: mission.question === q.text ? "var(--point-deep)" : "var(--ink-2)",
                        }}
                      >
                        {q.text}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addMission("question")}
            className="d flex-1 rounded-[10px] border py-2 text-xs"
            style={{ borderColor: "var(--rule)" }}
          >
            + 질문 미션
          </button>
          <button
            type="button"
            onClick={() => addMission("voice")}
            className="d flex-1 rounded-[10px] border py-2 text-xs"
            style={{ borderColor: "var(--rule)" }}
          >
            + 낭독 미션
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            if (cancelHref) {
              router.push(cancelHref);
              return;
            }
            setOpen(false);
          }}
          className="d flex-1 rounded-[14px] border py-2.5 text-sm"
          style={{ borderColor: "var(--rule)" }}
        >
          취소
        </button>
        <button
          type="button"
          disabled={!title.trim() || draftBooks.length === 0 || saving}
          onClick={submit}
          className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          {saving ? "만드는 중..." : "숙제 만들기"}
        </button>
      </div>
    </div>
  );
}
