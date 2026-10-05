"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getQuestions, addQuestion, type BookQuestion } from "@/lib/questions";

export default function QuestionPrompt({
  answer,
  onAnswerChange,
}: {
  answer: string;
  onAnswerChange: (value: string) => void;
}) {
  const [questions, setQuestions] = useState<BookQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState(false);
  const [reportNote, setReportNote] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    getQuestions(supabase).then((qs) => {
      setQuestions(qs);
      if (qs.length > 0) setIndex(Math.floor(Math.random() * qs.length));
    });
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user.id ?? null));
  }, []);

  const current = questions[index];
  // 다른 사용자가 보탠 질문만 신고할 수 있다(기본 질문·내 질문 제외).
  const canReport = Boolean(current?.createdBy && current.createdBy !== myId);

  // 질문 신고(Apple 1.2): 신고 접수 후 그 질문은 내 질문 목록에서 바로 뺀다.
  async function reportCurrent() {
    if (!current) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("content_reports")
      .insert({ target_type: "question", target_id: current.id, reason: "부적절한 질문" });
    setConfirmReport(false);
    if (error) {
      setReportNote("신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const rest = questions.filter((q) => q.id !== current.id);
    setQuestions(rest);
    setIndex(rest.length > 0 ? Math.floor(Math.random() * rest.length) : 0);
    onAnswerChange("");
    setReportNote("신고했어요. 이 질문은 더 이상 보이지 않아요.");
  }

  function shuffle() {
    if (questions.length <= 1) return;
    setIndex((prev) => {
      let next = Math.floor(Math.random() * questions.length);
      while (next === prev) next = Math.floor(Math.random() * questions.length);
      return next;
    });
    // 질문이 바뀌면 이전 질문에 쓰던 답은 지운다 -- 질문마다 새로 답할 수 있게.
    onAnswerChange("");
    setConfirmReport(false);
    setReportNote(null);
  }

  async function submitNew() {
    if (!newText.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    try {
      const q = await addQuestion(supabase, user.id, newText);
      if (q) {
        setIndex(questions.length);
        setQuestions((prev) => [...prev, q]);
      }
      setNewText("");
      setAdding(false);
    } catch {
      // MVP: 실패해도 조용히 넘어간다 -- 질문 추가는 부가 기능이라 기록
      // 저장 흐름 자체를 막을 정도는 아니다.
    }
    setSaving(false);
  }

  return (
    <div
      className="rounded-[14px] border px-4 py-3"
      style={{ borderColor: "var(--rule)", background: "var(--paper)" }}
    >
      {!adding ? (
        <>
          {questions.length > 0 && (
            <>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                오늘의 질문
              </p>
              <p className="hand mt-1 text-lg" style={{ color: "var(--ink)" }}>
                {current?.text}
              </p>
            </>
          )}
          <div className="mt-2 flex gap-3">
            {questions.length > 0 && (
              <button
                type="button"
                onClick={shuffle}
                className="d text-xs"
                style={{ color: "var(--point-deep)" }}
              >
                다른 질문
              </button>
            )}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="d text-xs"
              style={{ color: "var(--ink-2)" }}
            >
              + 질문 추가
            </button>
            {canReport && !confirmReport && (
              <button
                type="button"
                onClick={() => setConfirmReport(true)}
                className="ml-auto text-xs"
                style={{ color: "var(--ink-2)" }}
              >
                신고
              </button>
            )}
          </div>
          {confirmReport && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span style={{ color: "var(--ink-2)" }}>이 질문을 신고할까요?</span>
              <button type="button" onClick={() => setConfirmReport(false)} className="d" style={{ color: "var(--ink-2)" }}>
                취소
              </button>
              <button type="button" onClick={reportCurrent} className="d" style={{ color: "var(--berry)" }}>
                신고하기
              </button>
            </div>
          )}
          {reportNote && (
            <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
              {reportNote}
            </p>
          )}
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder={questions.length > 0 ? "답을 적어 주세요" : "부모 메모 (선택)"}
            rows={3}
            className="mt-3 w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="새로운 질문을 적어 주세요"
            className="rounded-[10px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewText("");
              }}
              className="d flex-1 rounded-[10px] border py-2 text-xs"
              style={{ borderColor: "var(--rule)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!newText.trim() || saving}
              onClick={submitNew}
              className="d flex-1 rounded-[10px] py-2 text-xs text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
