"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadMissionVoice } from "@/lib/storage";
import VoiceRecorder from "@/components/voice-recorder";

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
  coverUrl: string | null;
  completed: boolean;
};

export type TodayAssignment = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description: string | null;
  books: TodayBook[];
  missions: TodayMission[];
};

function QuickReadButton({
  childId,
  groupId,
  bookId,
}: {
  childId: string;
  groupId: string;
  bookId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function markRead() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("reading_records").insert({
      child_id: childId,
      book_id: bookId,
      group_id: groupId,
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={saving}
      onClick={markRead}
      className="d rounded-full px-3 py-1.5 text-xs text-white disabled:opacity-40"
      style={{ background: "var(--point)" }}
    >
      {saving ? "저장 중..." : "다 읽었어요"}
    </button>
  );
}

function QuestionMission({ childId, mission }: { childId: string; mission: TodayMission }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!mission.answerText);
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
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="mt-2 rounded-[10px] p-3" style={{ background: "var(--paper)" }}>
      <p className="text-sm">{mission.question}</p>
      {editing ? (
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
            className="d rounded-[10px] px-3 py-2 text-xs text-white disabled:opacity-40"
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
            onClick={() => setEditing(true)}
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
          <VoiceRecorder onRecorded={handleRecorded} label="낭독" />
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
  assignments,
  voiceAllowed,
}: {
  childId: string;
  assignments: TodayAssignment[];
  voiceAllowed: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="rounded-[var(--r)] border p-4"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          <p className="text-xs" style={{ color: "var(--lantern)" }}>
            {assignment.groupName}
          </p>
          <p className="d mt-0.5 text-base">{assignment.title}</p>
          {assignment.description && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              {assignment.description}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {assignment.books.map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2"
                style={{ borderColor: "var(--rule)" }}
              >
                <span className="text-sm">{book.title}</span>
                {book.completed ? (
                  <span className="text-xs" style={{ color: "var(--point-deep)" }}>
                    읽었어요
                  </span>
                ) : (
                  <QuickReadButton childId={childId} groupId={assignment.groupId} bookId={book.id} />
                )}
              </div>
            ))}
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
      ))}
    </div>
  );
}
