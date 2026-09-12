"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadMissionVoice } from "@/lib/storage";
import { setRead } from "@/lib/quick-read";
import VoiceRecorder from "@/components/voice-recorder";
import RecordEditModal, { type EditableRecord } from "@/components/record-edit-modal";
import type { ReadingStatus } from "@/lib/reading-status";
import { dueBadge, formatDueLong, formatShortMd } from "@/lib/assignment-period";
import { isAssignmentDone } from "@/lib/assignment-status";
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

// 완료 조건 판정 함수(isAssignmentDone)는 lib/assignment-status.ts로 옮겼다 --
// 이 파일은 "use client"라, 여기서 export한 함수를 서버 컴포넌트가 직접 import해
// 부르면 클라이언트 참조 프록시가 넘어와 렌더링이 죽는다(실제로 겪음). 기존
// import 경로(@/components/assignment-today)를 쓰던 클라이언트 컴포넌트를 위해
// 그대로 재수출한다 -- 클라이언트 번들 안에서는 실제 함수라 문제없다.
export { isAssignmentDone };

/** 책 하나의 기록 화면 링크(제목·저자·표지·그룹 미리 채움) -- 기존 동작 그대로. */
function recordHref(book: TodayBook, groupId: string): string {
  return `/library/add?bookId=${encodeURIComponent(book.id)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author ?? "")}&cover=${encodeURIComponent(book.coverUrl ?? "")}&groupId=${encodeURIComponent(groupId)}`;
}

/** 숙제 책 한 줄 -- 큰 표지 + 제목/작가 + 상태에 맞는 버튼(체크 아이콘 대신
 * "읽기 시작"/"다 읽었어요"/"완료 취소"). 완료 취소는 기존 setRead(false)를
 * 그대로 재사용해 done → want로 되돌린다(기존 데이터 구조·권한 그대로). */
function HomeworkBookRow({
  book,
  childId,
  groupId,
  onEdit,
}: {
  book: TodayBook;
  childId: string;
  groupId: string;
  onEdit: (book: TodayBook) => void;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const done = optimistic ?? book.completed;

  async function setDone(next: boolean) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setOptimistic(next);
    await setRead(createClient(), childId, book.id, groupId, next);
    guard.current = false;
    setBusy(false);
    router.refresh();
    // 화면 이동 없이 바로 끝나는 토글이라, 하단 탭의 숙제 알림 점이 다음
    // 화면 전환을 기다리지 않고 바로 갱신되도록 알린다.
    window.dispatchEvent(new Event("chaeksup:assignment-changed"));
  }

  const cover = book.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.coverUrl}
      alt=""
      className="h-20 w-14 flex-none rounded-[6px] object-cover"
      style={{ border: "1px solid var(--rule)" }}
    />
  ) : (
    <span
      className="flex h-20 w-14 flex-none items-center justify-center rounded-[6px] text-center text-[10px] leading-tight"
      style={{ background: "var(--paper)", color: "var(--ink-2)" }}
    >
      표지 없음
    </span>
  );

  const titleBlock = (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[17px] leading-snug">{book.title}</span>
      {book.author && (
        <span className="mt-0.5 block truncate text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
          {book.author}
        </span>
      )}
      {book.targetPage && !done && (
        <span className="mt-1 block text-xs" style={{ color: "var(--ink-2)" }}>
          {book.targetPage}쪽까지 읽어요
        </span>
      )}
    </span>
  );

  if (done) {
    return (
      <div className="flex w-full items-center gap-3 py-3">
        {cover}
        <button type="button" onClick={() => onEdit(book)} className="min-w-0 flex-1 text-left">
          {titleBlock}
        </button>
        <span className="flex flex-none flex-col items-end gap-1.5">
          <span
            className="d rounded-full px-2.5 py-1 text-xs font-semibold text-white"
            style={{ background: "var(--point)" }}
          >
            다 읽었어요
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDone(false)}
            className="text-[11px] underline disabled:opacity-40"
            style={{ color: "var(--ink-2)" }}
          >
            완료 취소
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 py-3">
      {cover}
      <Link href={recordHref(book, groupId)} className="min-w-0 flex-1">
        {titleBlock}
      </Link>
      <span className="flex flex-none flex-col items-end gap-1.5">
        <Link
          href={recordHref(book, groupId)}
          className="d w-[88px] whitespace-nowrap rounded-full py-1.5 text-center text-xs font-semibold text-white"
          style={{ background: "var(--point-deep)" }}
        >
          읽기 시작
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDone(true)}
          className="d w-[88px] whitespace-nowrap rounded-full border py-1 text-center text-xs disabled:opacity-40"
          style={{ borderColor: "var(--point-deep)", color: "var(--point-deep)" }}
        >
          다 읽었어요
        </button>
      </span>
    </div>
  );
}

/** 질문 미션 -- 기본은 접혀 있고 "답 적기"/"내 답 보기"/"답 수정" 버튼으로
 * 편다(체크 아이콘·상시 입력창 대신 실제 상태에 맞는 버튼). */
function QuestionMission({ childId, mission }: { childId: string; mission: TodayMission }) {
  const router = useRouter();
  const hasAnswer = Boolean(mission.answerText?.trim());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
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
    setOpen(true);
    router.refresh();
  }

  return (
    <div
      id={`mission-${mission.id}`}
      className="mt-2 rounded-[12px] p-3"
      style={{ background: "var(--paper)", scrollMarginTop: "190px" }}
    >
      <p className="text-sm">{mission.question}</p>

      {editing ? (
        <div className="mt-2 flex min-w-0 gap-2">
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
            style={{ background: "var(--point-deep)" }}
          >
            저장
          </button>
        </div>
      ) : hasAnswer && open ? (
        <div className="mt-2">
          <p className="text-sm" style={{ color: "var(--point-deep)" }}>
            {mission.answerText}
          </p>
          <button
            type="button"
            onClick={() => {
              setAnswer(mission.answerText ?? "");
              setEditing(true);
            }}
            className="d mt-1.5 text-xs"
            style={{ color: "var(--ink-2)" }}
          >
            답 수정
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (hasAnswer ? setOpen(true) : setEditing(true))}
          className="d mt-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: hasAnswer ? "var(--point)" : "var(--point-deep)" }}
        >
          {hasAnswer ? "내 답 보기" : "답 적기"}
        </button>
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
    <div className="mt-2 rounded-[12px] p-3" style={{ background: "var(--paper)" }}>
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

const TONE_COLOR: Record<"today" | "tomorrow" | "overdue", string> = {
  today: "var(--lantern)",
  tomorrow: "var(--point)",
  overdue: "var(--berry)",
};

/** 숙제 카드 하나 -- 마감일(크게) → 등록일·그룹명(작게) → 제목·설명(연한
 * 배경) → 책 목록(흰 배경, 1단계) → 질문·낭독(2단계). 순서·음영 구분은
 * 사용자가 지정한 그대로다. */
function AssignmentCard({
  assignment,
  childId,
  voiceAllowed,
  onEdit,
}: {
  assignment: TodayAssignment;
  childId: string;
  voiceAllowed: boolean;
  onEdit: (book: TodayBook) => void;
}) {
  const due = assignment.endDate ?? assignment.startDate ?? assignment.createdAt.slice(0, 10);
  const done = isAssignmentDone(assignment);
  // 완료된 숙제는 "오늘까지"/"기한 지남" 같은 급함 배지가 필요 없다 --
  // 완료 배지 하나로 충분하고, 급함 배지와 같이 있으면 오히려 헷갈린다.
  const badge = done ? null : dueBadge(due);
  const completedCount = assignment.books.filter((b) => b.completed).length;
  const totalBooks = assignment.books.length;
  const hasQuestionStep = assignment.missions.some((m) => m.type === "question" || m.type === "voice");
  const twoSteps = totalBooks > 0 && hasQuestionStep;

  return (
    <div
      id={assignment.id}
      className="overflow-hidden rounded-[var(--r)] border"
      style={{ borderColor: done ? "var(--point)" : "var(--rule)", background: "var(--card)", scrollMarginTop: "190px" }}
    >
      {/* 마감일 구역 -- 사용자가 지정한 정보 순서의 맨 앞. 그룹은 위
          그룹 탭에서 이미 골랐으므로 여기 또 보여줄 필요가 없고(사용자
          지적), 등록일은 오른쪽으로 뺀다(사용자 지적). */}
      <div className="px-[20px] pt-[16px] pb-[10px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="d text-[19px] leading-[26px]">{formatDueLong(due)}까지</p>
            {badge && (
              <span
                className="d rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: TONE_COLOR[badge.tone] }}
              >
                {badge.label}
              </span>
            )}
            {done && (
              <span
                className="d rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: "var(--point)" }}
              >
                숙제 완료
              </span>
            )}
          </div>
          <span className="flex-none pt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            {formatShortMd(assignment.createdAt.slice(0, 10))} 등록
          </span>
        </div>
      </div>

      {/* 제목·설명 -- 연한 배경(선생님 원문 그대로, 수정·삭제 없음). 위쪽
          여백을 넉넉히 두고, "N권 중 M권 읽었어요"는 제목과 같은 줄
          오른쪽에 둬서 카드 높이를 줄인다(사용자 지적). */}
      <div className="px-[20px] pt-[14px] pb-[14px]" style={{ background: "var(--paper)" }}>
        <div className="flex items-start justify-between gap-2">
          <p className="d min-w-0 flex-1 truncate text-[16px] leading-snug">{assignment.title}</p>
          {totalBooks > 0 && (
            <span
              className="flex-none pt-0.5 text-xs"
              style={{ color: done ? "var(--point-deep)" : "var(--ink-2)" }}
            >
              {totalBooks}권 중 {completedCount}권 읽었어요
            </span>
          )}
        </div>
        {assignment.description && (
          <p className="mt-1 text-sm leading-snug" style={{ color: "var(--ink)", overflowWrap: "anywhere" }}>
            {assignment.description}
          </p>
        )}
      </div>

      {/* 책 목록 -- 흰 배경. */}
      {totalBooks > 0 && (
        <div className="px-[20px]">
          {twoSteps && (
            <p className="d pt-3 text-xs" style={{ color: "var(--ink-2)" }}>
              1단계 · 책 읽기
            </p>
          )}
          <div className="divide-y" style={{ borderColor: "rgba(38,54,43,0.08)" }}>
            {assignment.books.map((book) => (
              <HomeworkBookRow key={book.id} book={book} childId={childId} groupId={assignment.groupId} onEdit={onEdit} />
            ))}
          </div>
        </div>
      )}

      {/* 질문·낭독 -- 2단계(둘 다 있을 때만 단계 표시). */}
      {assignment.missions.length > 0 && (
        <div className="px-[20px] pb-[16px]">
          {twoSteps && (
            <p className="d pt-1 text-xs" style={{ color: "var(--ink-2)" }}>
              2단계 · 질문 확인 및 답변 작성
            </p>
          )}
          {assignment.missions.map((mission) =>
            mission.type === "question" ? (
              <QuestionMission key={mission.id} childId={childId} mission={mission} />
            ) : mission.type === "voice" ? (
              <VoiceMission key={mission.id} childId={childId} mission={mission} voiceAllowed={voiceAllowed} />
            ) : null
          )}
        </div>
      )}

      {/* 책도 미션도 없는 예외적인 숙제라도 아래쪽 여백은 있어야 한다. */}
      {totalBooks === 0 && assignment.missions.length === 0 && <div className="pb-[16px]" />}
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

  return (
    <div className="flex flex-col gap-4">
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          childId={childId}
          voiceAllowed={voiceAllowed}
          onEdit={setEditing}
        />
      ))}

      {editing && (
        <RecordEditModal record={toEditable(editing, childId, childName)} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
