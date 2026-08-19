"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getQuestions, addQuestion, type BookQuestion } from "@/lib/questions";

export default function QuestionPrompt() {
  const [questions, setQuestions] = useState<BookQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    getQuestions(supabase).then((qs) => {
      setQuestions(qs);
      if (qs.length > 0) setIndex(Math.floor(Math.random() * qs.length));
    });
  }, []);

  function shuffle() {
    if (questions.length <= 1) return;
    setIndex((prev) => {
      let next = Math.floor(Math.random() * questions.length);
      while (next === prev) next = Math.floor(Math.random() * questions.length);
      return next;
    });
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

  if (questions.length === 0 && !adding) return null;

  return (
    <div
      className="rounded-[14px] border px-4 py-3"
      style={{ borderColor: "var(--rule)", background: "var(--paper)" }}
    >
      {!adding ? (
        <>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            오늘의 질문
          </p>
          <p className="mt-1 text-sm">{questions[index]?.text}</p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={shuffle}
              className="d text-xs"
              style={{ color: "var(--point-deep)" }}
            >
              다른 질문
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="d text-xs"
              style={{ color: "var(--ink-2)" }}
            >
              + 질문 추가
            </button>
          </div>
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
