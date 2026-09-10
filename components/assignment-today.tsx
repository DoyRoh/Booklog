"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadMissionVoice } from "@/lib/storage";
import VoiceRecorder from "@/components/voice-recorder";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";
import type { ReadingStatus } from "@/lib/reading-status";
import { ReadCheck } from "@/components/read-toggles";
import { LogGroup, LogRow, shortMd } from "@/components/log-row";
import { effectiveRange } from "@/lib/assignment-period";
import { missionChip } from "@/lib/assignment-chip";
import { kstDate } from "@/lib/kst";

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
    readDate: book.readDate ?? kstDate(),
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
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
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
            className="min-w-0 flex-1 rounded-[10px] border px-3 py-2 text-sm outline-none"
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
          {/* 이미 제출한 녹음은 녹음기 안에서 보여준다 -- 따로 <audio>를 두면
              다시 녹음한 뒤 녹음기의 미리듣기와 제출본 두 개가 나란히 떴다. */}
          <VoiceRecorder onRecorded={handleRecorded} label="낭독 시작" existingUrl={mission.voiceSignedUrl} />
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
    <div className="mt-4 flex flex-col gap-4">
      {sections.map((section) => (
        <LogGroup key={section.groupName} heading={section.groupName} headingSub={`숙제 ${section.assignments.length}개`}>
          {section.assignments.map((assignment, index) => {
            const completedCount = assignment.books.filter((book) => book.completed).length;
            const allDone = completedCount === assignment.books.length && assignment.books.length > 0;
            return (
              <div key={assignment.id} id={assignment.id} className="scroll-mt-4">
                <LogRow
                  first={index === 0}
                  dateTop={shortMd(effectiveRange(assignment).start)}
                  dateBottom={`~${shortMd(effectiveRange(assignment).end)}`}
                  chip={missionChip(assignment.missions)}
                  title={<span className="d">{assignment.title}</span>}
                  subtitle={assignment.description ?? undefined}
                  right={
                    <span
                      className="d rounded-full px-2 py-0.5 text-[11px]"
                      style={{
                        background: allDone ? "rgba(47,168,79,0.12)" : "var(--paper)",
                        color: allDone ? "var(--point-deep)" : "var(--ink-2)",
                      }}
                    >
                      {completedCount}/{assignment.books.length}
                    </span>
                  }
                />
                {/* 책 줄과 미션은 LogRow 안에 넣지 않고(글 칸이 좁아 제목이 잘림) 그 아래에
                    따로 둔다. 왼쪽은 날짜 칸(w-11 + 간격) 만큼 비워 칩 칸부터 시작하고
                    오른쪽은 박스 끝까지 -- 숲길 목록의 책 줄과 같은 폭·같은 형식
                    (제목 두 줄까지 + 작은 작가명, 오른쪽 체크). */}
                {(assignment.books.length > 0 || assignment.missions.length > 0) && (
                  <div className="pr-4 pl-[4.25rem] pb-2">
                    {assignment.books.map((book, bookIndex) => {
                      const label = (
                        <span className="block min-w-0">
                          <span
                            className="block text-sm leading-snug"
                            style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                          >
                            {book.title}
                            {book.targetPage && !book.completed && (
                              <span className="ml-1.5 text-xs" style={{ color: "var(--ink-2)" }}>
                                {book.targetPage}쪽까지
                              </span>
                            )}
                          </span>
                          {book.author && (
                            <span className="mt-0.5 block truncate text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
                              {book.author}
                            </span>
                          )}
                        </span>
                      );
                      return (
                        <div
                          key={book.id}
                          className="flex items-center gap-2"
                          style={bookIndex > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
                        >
                          {/* 제목을 누르면 기록 화면(안 읽음) / 기록 고치기(읽음). 오른쪽 체크는
                              기록 화면 없이 바로 "읽었어요"만 켜고 끈다. */}
                          {book.completed ? (
                            <button
                              type="button"
                              disabled={!book.recordId}
                              onClick={() => setEditing(book)}
                              className="min-w-0 flex-1 py-2.5 text-left"
                            >
                              {label}
                            </button>
                          ) : (
                            <Link
                              href={`/library/add?bookId=${encodeURIComponent(book.id)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(assignment.groupId)}`}
                              className="min-w-0 flex-1 py-2.5"
                            >
                              {label}
                            </Link>
                          )}
                          <span className="-mr-2 flex flex-none items-center">
                            <ReadCheck childId={childId} bookId={book.id} groupId={assignment.groupId} done={book.completed} size={24} />
                          </span>
                        </div>
                      );
                    })}

                    {assignment.missions.map((mission) =>
                      mission.type === "question" ? (
                        <QuestionMission key={mission.id} childId={childId} mission={mission} />
                      ) : mission.type === "voice" ? (
                        <VoiceMission key={mission.id} childId={childId} mission={mission} voiceAllowed={voiceAllowed} />
                      ) : null
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </LogGroup>
      ))}

      {editing && (
        <RecordEditModal record={toEditable(editing, childId, childName)} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
