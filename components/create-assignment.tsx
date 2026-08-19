"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getQuestions, addQuestion, type BookQuestion } from "@/lib/questions";

type BookOption = { id: string; title: string };
type MissionType = "question" | "voice";
type DraftMission = { type: MissionType; question: string };

const MISSION_LABELS: Record<MissionType, string> = {
  question: "질문에 답하기",
  voice: "소리 내어 읽기 녹음",
};

export default function CreateAssignment({
  groupId,
  books,
}: {
  groupId: string;
  books: BookOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [missions, setMissions] = useState<DraftMission[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankQuestions, setBankQuestions] = useState<BookQuestion[]>([]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    getQuestions(supabase).then(setBankQuestions);
  }, [open]);

  function toggleBook(id: string) {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    setStartDate("");
    setEndDate("");
    setSelectedBookIds(new Set());
    setMissions([]);
    setError(null);
  }

  async function submit() {
    if (!title.trim() || selectedBookIds.size === 0) return;
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
      start_date: startDate || null,
      end_date: endDate || null,
      created_by: user.id,
    });
    if (assignmentError) {
      setError(assignmentError.message);
      setSaving(false);
      return;
    }

    const { error: booksError } = await supabase.from("assignment_books").insert(
      Array.from(selectedBookIds).map((bookId) => ({
        assignment_id: assignmentId,
        book_id: bookId,
        required: true,
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
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="d w-full rounded-[var(--r)] border px-4 py-3 text-sm"
        style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
      >
        + 숙제 만들기
      </button>
    );
  }

  return (
    <div
      className="rounded-[var(--r)] border p-4"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      <p className="d text-sm">숙제 만들기</p>

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

      <div className="mt-2 flex gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 rounded-[14px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--rule)" }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 rounded-[14px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--rule)" }}
        />
      </div>

      <p className="d mt-4 text-xs" style={{ color: "var(--ink-2)" }}>
        읽을 책 고르기
      </p>
      {books.length === 0 ? (
        <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
          먼저 추천도서를 등록해 주세요.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {books.map((book) => (
            <label
              key={book.id}
              className="flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              <input
                type="checkbox"
                checked={selectedBookIds.has(book.id)}
                onChange={() => toggleBook(book.id)}
              />
              {book.title}
            </label>
          ))}
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
            setOpen(false);
          }}
          className="d flex-1 rounded-[14px] border py-2.5 text-sm"
          style={{ borderColor: "var(--rule)" }}
        >
          취소
        </button>
        <button
          type="button"
          disabled={!title.trim() || selectedBookIds.size === 0 || saving}
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
