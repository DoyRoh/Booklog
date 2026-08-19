"use client";

import { useState } from "react";
import Link from "next/link";
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
  author: string | null;
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
      {assignments.map((assignment) => {
        const completedCount = assignment.books.filter((book) => book.completed).length;
        return (
          <div
            key={assignment.id}
            id={assignment.id}
            className="rounded-[var(--r)] border p-4 scroll-mt-4"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm" style={{ color: "var(--lantern)" }}>
                  {assignment.groupName}
                </p>
                <p className="d mt-0.5 text-lg">{assignment.title}</p>
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
              <p className="mt-1 text-base" style={{ color: "var(--ink-2)" }}>
                {assignment.description}
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2">
              {assignment.books.map((book) =>
                book.completed ? (
                  <div
                    key={book.id}
                    className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5"
                    style={{ borderColor: "var(--rule)" }}
                  >
                    <span className="text-base">{book.title}</span>
                    <span className="text-sm" style={{ color: "var(--point-deep)" }}>
                      읽었어요
                    </span>
                  </div>
                ) : (
                  <Link
                    key={book.id}
                    href={`/library/add?bookId=${encodeURIComponent(book.id)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(assignment.groupId)}`}
                    className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5"
                    style={{ borderColor: "var(--rule)" }}
                  >
                    <span className="text-base">{book.title}</span>
                    <span className="d text-sm" style={{ color: "var(--point)" }}>
                      기록하기
                    </span>
                  </Link>
                )
              )}
            </div>

            {assignment.missions
              .filter((mission) => mission.type === "voice")
              .map((mission) => (
                <VoiceMission
                  key={mission.id}
                  childId={childId}
                  mission={mission}
                  voiceAllowed={voiceAllowed}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
