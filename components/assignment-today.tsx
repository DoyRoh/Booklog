"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadMissionVoice } from "@/lib/storage";
import VoiceRecorder from "@/components/voice-recorder";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";
import type { ReadingStatus } from "@/lib/reading-status";

export type TodayMission = {
  id: string;
  type: "read" | "question" | "voice" | "drawing" | "photo";
  question: string | null;
  answerText: string | null;
  voiceSignedUrl: string | null;
};

export type TodayBook = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  completed: boolean;
  // null이면 완독이 숙제, 값이 있으면 그 쪽수까지만 읽으면 되는 숙제다.
  targetPage: number | null;
  // completed=true일 때만 채워진다 -- 이 자리에서 바로 기록을 고칠 수 있게 함.
  recordId: string | null;
  status: ReadingStatus | null;
  rating: number | null;
  emotion: string | null;
  favorite: boolean;
  memo: string | null;
  readDate: string | null;
  pagesRead: number | null;
  shelfTagId: string | null;
  photoPath: string | null;
  voicePath: string | null;
};

function toEditable(book: TodayBook, childId: string, childName: string | null): EditableRecord {
  return {
    id: book.recordId as string,
    childId,
    childName,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    status: book.status ?? "done",
    rating: book.rating,
    emotion: book.emotion,
    favorite: book.favorite,
    memo: book.memo ?? "",
    readDate: book.readDate ?? new Date().toISOString().slice(0, 10),
    pagesRead: book.pagesRead,
    shelfTagId: book.shelfTagId,
    photoPath: book.photoPath,
    voicePath: book.voicePath,
  };
}

export type TodayAssignment = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description: string | null;
  books: TodayBook[];
  missions: TodayMission[];
};

function QuestionMission({ childId, mission }: { childId: string; mission: TodayMission }) {
  const router = useRouter();
  const [editingAnswer, setEditingAnswer] = useState(!mission.answerText);
  const [answer, setAnswer] = useState(mission.answerText ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!answer.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("assignment_mission_responses")
      .upsert(
        { mission_id: mission.id, child_id: childId, answer_text: answer.trim() },
        { onConflict: "mission_id,child_id" }
      );
    setSaving(false);
    setEditingAnswer(false);
    router.refresh();
  }

  return (
    <div className="mt-2 rounded-[10px] p-3" style={{ background: "var(--paper)" }}>
      <p className="text-sm">{mission.question}</p>
      {editingAnswer ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="답을 적어 주세요"
            className="flex-1 rounded-[10px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
          <button
            type="button"
            disabled={!answer.trim() || saving}
            onClick={save}
            className="d flex-none whitespace-nowrap rounded-[10px] px-3 py-2 text-xs text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            저장
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm" style={{ color: "var(--point-deep)" }}>
            {mission.answerText}
          </p>
          <button
            type="button"
            onClick={() => setEditingAnswer(true)}
            className="d text-xs"
            style={{ color: "var(--ink-2)" }}
          >
            수정
          </button>
        </div>
      )}
    </div>
  );
}

function VoiceMission({
  childId,
  mission,
  voiceAllowed,
}: {
  childId: string;
  mission: TodayMission;
  voiceAllowed: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRecorded(blob: Blob) {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = await uploadMissionVoice(supabase, childId, mission.id, blob);
      await supabase
        .from("assignment_mission_responses")
        .upsert(
          { mission_id: mission.id, child_id: childId, voice_url: path },
          { onConflict: "mission_id,child_id" }
        );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했어요.");
    }
    setSaving(false);
  }

  return (
    <div className="mt-2 rounded-[10px] p-3" style={{ background: "var(--paper)" }}>
      <p className="text-sm">{mission.question ?? "소리 내어 읽어보아요"}</p>
      {!voiceAllowed ? (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
          온보딩에서 음성 녹음에 동의하지 않으셨어요.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {mission.voiceSignedUrl && (
            <audio src={mission.voiceSignedUrl} controls className="h-9 w-full" />
          )}
          <VoiceRecorder onRecorded={handleRecorded} label="낭독 시작" />
          {saving && (
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>
              저장 중...
            </p>
          )}
          {error && (
            <p className="text-xs" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssignmentToday({
  childId,
  childName,
  assignments,
  voiceAllowed,
}: {
  childId: string;
  childName: string | null;
  assignments: TodayAssignment[];
  voiceAllowed: boolean;
}) {
  const [editing, setEditing] = useState<TodayBook | null>(null);

  // 같은 그룹의 숙제끼리는 섹션으로 묶어, 그룹명을 카드마다 반복하지 않고
  // 섹션 헤더 한 번만 보여준다(오늘 탭 요약의 그룹핑과 같은 패턴).
  const sections: { groupName: string; assignments: TodayAssignment[] }[] = [];
  for (const assignment of assignments) {
    const section = sections.find((s) => s.groupName === assignment.groupName);
    if (section) section.assignments.push(assignment);
    else sections.push({ groupName: assignment.groupName, assignments: [assignment] });
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.groupName}>
          <p className="d text-sm" style={{ color: "var(--lantern)" }}>
            {section.groupName}
          </p>
          {/* 그룹당 숙제가 여러 개여도 박스를 나누지 않고, 하나의 박스
              안에서 구분선으로만 나눈다(추천도서 목록과 같은 패턴). */}
          <div
            className="mt-2 overflow-hidden rounded-[var(--r)] border"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            {section.assignments.map((assignment, index) => {
              const completedCount = assignment.books.filter((book) => book.completed).length;
              return (
                <div
                  key={assignment.id}
                  id={assignment.id}
                  className="p-4 scroll-mt-4"
                  style={index > 0 ? { borderTop: "1px solid var(--rule)" } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="d text-base">{assignment.title}</p>
                    </div>
                    <span
                      className="d flex-none rounded-full px-3 py-1 text-sm"
                      style={{
                        background:
                          completedCount === assignment.books.length && assignment.books.length > 0
                            ? "rgba(47,168,79,0.12)"
                            : "var(--paper)",
                        color:
                          completedCount === assignment.books.length && assignment.books.length > 0
                            ? "var(--point-deep)"
                            : "var(--ink-2)",
                      }}
                    >
                      {completedCount}/{assignment.books.length} 완료
                    </span>
                  </div>
                  {assignment.description && (
                    <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
                      {assignment.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    {assignment.books.map((book) =>
                      book.completed ? (
                        <button
                          key={book.id}
                          type="button"
                          disabled={!book.recordId}
                          onClick={() => setEditing(book)}
                          className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left"
                          style={{ borderColor: "var(--rule)" }}
                        >
                          <span className="text-sm">{book.title}</span>
                          <span className="text-sm" style={{ color: "var(--point-deep)" }}>
                            읽었어요
                          </span>
                        </button>
                      ) : (
                        <Link
                          key={book.id}
                          href={`/library/add?bookId=${encodeURIComponent(book.id)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(assignment.groupId)}`}
                          className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5"
                          style={{ borderColor: "var(--rule)" }}
                        >
                          <div>
                            <span className="text-sm">{book.title}</span>
                            {book.targetPage && (
                              <span className="ml-1.5 text-xs" style={{ color: "var(--ink-2)" }}>
                                {book.targetPage}쪽까지
                              </span>
                            )}
                          </div>
                          <span className="d text-sm" style={{ color: "var(--point)" }}>
                            기록하기
                          </span>
                        </Link>
                      )
                    )}
                  </div>

                  {assignment.missions.map((mission) =>
                    mission.type === "question" ? (
                      <QuestionMission key={mission.id} childId={childId} mission={mission} />
                    ) : mission.type === "voice" ? (
                      <VoiceMission
                        key={mission.id}
                        childId={childId}
                        mission={mission}
                        voiceAllowed={voiceAllowed}
                      />
                    ) : null
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {editing && (
        <RecordEditModal record={toEditable(editing, childId, childName)} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
