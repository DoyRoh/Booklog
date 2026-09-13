"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasVoiceConsent } from "@/lib/consent";
import { getSignedMediaUrl, uploadChildPhoto, uploadChildVoice } from "@/lib/storage";
import type { ReadingStatus } from "@/lib/reading-status";
import { BOOK_CATEGORIES, categoryColor } from "@/lib/categories";
import RatingPicker from "@/components/rating-picker";
import ReadDatePicker from "@/components/read-date-picker";
import PhotoPicker from "@/components/photo-picker";
import VoiceRecorder from "@/components/voice-recorder";
import ShelfTagPicker from "@/components/shelf-tag-picker";

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want: "읽고 싶어요",
  reading: "읽는 중이에요",
  done: "다 읽었어요",
};

export type EditableRecord = {
  id: string;
  childId: string;
  childName: string | null;
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  status: ReadingStatus;
  rating: number | null;
  emotion: string | null;
  favorite: boolean;
  memo: string;
  readDate: string;
  pagesRead: number | null;
  shelfTagId: string | null;
  // reading_records.photo_url/voice_url 원본 경로(서명 안 된 값) -- 모달이
  // 열릴 때 직접 서명해서 미리보기를 만든다. 목록 화면마다 미리 서명해두면
  // 카드가 많을 때 그만큼 왕복이 늘어나므로, 실제로 열어볼 때만 서명한다.
  photoPath: string | null;
  voicePath: string | null;
};

export default function RecordEditModal({
  record,
  onClose,
}: {
  record: EditableRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReadingStatus>(record.status);
  const [rating, setRating] = useState(record.rating);
  // 이미 뭔가 남겨둔 기록(메모·사진·목소리·즐겨찾기·책장)이면 펼친 채로,
  // 아니면 접은 채로 연다(기록 남기기 화면의 "더 남기기"와 같은 구조).
  const [more, setMore] = useState(
    Boolean(record.memo || record.photoPath || record.voicePath || record.favorite || record.shelfTagId)
  );
  const [favorite, setFavorite] = useState(record.favorite);
  const [memo, setMemo] = useState(record.memo);
  const [readDate, setReadDate] = useState(record.readDate);
  const [pagesRead, setPagesRead] = useState(record.pagesRead ? String(record.pagesRead) : "");
  const [shelfTagId, setShelfTagId] = useState(record.shelfTagId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 삭제 확인을 window.confirm() 대신 화면 안 두 단계 버튼으로 한다 --
  // iOS에서 홈 화면에 추가한 PWA(standalone 모드)는 window.confirm()이
  // 아예 동작하지 않는 경우가 있어("삭제하기 버튼 안 먹히네"라는 신고와
  // 정확히 일치하는 증상), 브라우저 네이티브 대화상자에 기대지 않는다.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 분야 태그 -- 기록 남기기(library/add)에는 있었지만 기록 고치기엔
  // 빠져 있던 기능("카테고리도 선택 가능하게 안 되어있네"). 이미 있는
  // 분야는 먼저 보여주고(existingCategories), 저장 시엔 새로 고른 것만
  // 추가한다 -- 다른 사람이 이미 붙인 분야를 지우지 않기 위해.
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [existingCategories, setExistingCategories] = useState<Set<string>>(new Set());

  const [voiceAllowed, setVoiceAllowed] = useState(false);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [voiceSignedUrl, setVoiceSignedUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceRemoved, setVoiceRemoved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      hasVoiceConsent(supabase, user.id).then(setVoiceAllowed);
    });
    if (record.photoPath) {
      getSignedMediaUrl(supabase, record.photoPath).then(setPhotoSignedUrl);
    }
    if (record.voicePath) {
      getSignedMediaUrl(supabase, record.voicePath).then(setVoiceSignedUrl);
    }
    supabase
      .from("book_categories")
      .select("category")
      .eq("book_id", record.bookId)
      .then(({ data }) => {
        const set = new Set((data ?? []).map((r) => r.category as string));
        setExistingCategories(set);
        setCategories(set);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCategory(category: string) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      status,
      rating,
      favorite,
      parent_memo: memo || null,
      read_date: readDate,
      pages_read: status === "reading" && pagesRead ? Number(pagesRead) : null,
      shelf_tag_id: shelfTagId,
    };

    try {
      if (photoFile) updates.photo_url = await uploadChildPhoto(supabase, record.childId, photoFile);
      else if (photoRemoved) updates.photo_url = null;

      if (voiceBlob) updates.voice_url = await uploadChildVoice(supabase, record.childId, voiceBlob);
      else if (voiceRemoved) updates.voice_url = null;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "사진/음성 업로드에 실패했어요.");
      setSaving(false);
      return;
    }

    // 이미 있던 분야는 건드리지 않고, 이번에 새로 고른 것만 추가한다
    // (library/add와 같은 규칙).
    const newCategories = Array.from(categories).filter((c) => !existingCategories.has(c));
    if (newCategories.length > 0) {
      await supabase
        .from("book_categories")
        .upsert(
          newCategories.map((category) => ({ book_id: record.bookId, category })),
          { onConflict: "book_id,category", ignoreDuplicates: true }
        );
    }

    const { error: updateError } = await supabase
      .from("reading_records")
      .update(updates)
      .eq("id", record.id);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
    router.refresh();
    window.dispatchEvent(new Event("chaeksup:assignment-changed"));
  }

  async function deleteRecord() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    // .select("id")로 실제 삭제된 행을 확인한다 -- RLS가 막아서 0행이
    // 지워졌는데도 에러 없이 "성공"으로 끝나면(권한이 없는 기록을 잘못
    // 열람한 경우 등) 삭제 버튼이 아무 일도 안 하는 것처럼 보인다.
    const { data, error: deleteError } = await supabase
      .from("reading_records")
      .delete()
      .eq("id", record.id)
      .select("id");
    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }
    if (!data || data.length === 0) {
      setError("이 기록을 삭제할 권한이 없어요.");
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }
    onClose();
    router.refresh();
    window.dispatchEvent(new Event("chaeksup:assignment-changed"));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(38,54,43,0.45)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] p-5 pb-8 sm:rounded-[24px]"
        style={{ background: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="d text-base">기록 고치기</p>
          <button type="button" onClick={onClose} className="text-sm" style={{ color: "var(--ink-2)" }}>
            닫기
          </button>
        </div>

        <div
          className="mt-3 flex gap-3 rounded-[var(--r)] border p-3"
          style={{ borderColor: "var(--rule)" }}
        >
          {record.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.coverUrl} alt="" className="h-20 w-14 rounded object-cover" />
          )}
          <div>
            <p className="d text-sm">{record.title}</p>
            {record.author && (
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                {record.author}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
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

        <div className="mt-4">
          <ReadDatePicker
            value={readDate}
            onChange={setReadDate}
            disabled={status === "want"}
            disabledHint="다 읽고 나서 골라요"
          />
        </div>

        {status === "reading" && (
          <div className="mt-4">
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

        <div className="mx-1 mt-4" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }} />

        <div className="mt-4">
          <p className="d text-sm">책은 어땠어?</p>
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
          className="d mt-4 flex w-full items-center justify-between rounded-[14px] border px-4 py-3 text-sm"
          style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
        >
          <span>{more ? "간단히" : "더 남기기"}</span>
          <span className="text-xs font-normal">책장 · 분야 · 메모 · 사진 · 목소리</span>
        </button>

        {more && (
          <>
            <div className="mt-4">
              <ShelfTagPicker childId={record.childId} value={shelfTagId} onChange={setShelfTagId} />
            </div>

            <div className="mt-4">
              <p className="d text-sm">어느 분야인가요? (선택, 여러 개 가능)</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BOOK_CATEGORIES.map((category) => {
                  const on = categories.has(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="d rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: on ? categoryColor(category) : "var(--rule)",
                        background: on ? categoryColor(category) : "var(--card)",
                        color: on ? "#fff" : "var(--ink-2)",
                      }}
                      aria-pressed={on}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            <label
              className="mt-4 flex items-center gap-3 rounded-[var(--r)] border px-4 py-3"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
              <span className="text-sm">가장 좋아하는 책으로 남기기</span>
            </label>

            <textarea
              placeholder="부모 메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-[14px] border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            />

            <div
              className="mt-4 rounded-[var(--r)] border p-4"
              style={{ borderColor: "var(--rule)", background: "var(--card)" }}
            >
              <p className="d text-sm">{record.childName ? `${record.childName}의 기록` : "우리 아이의 기록"}</p>

              <div className="mt-3">
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  인상 깊었던 장면을 사진으로 남겨보세요
                </p>
                <div className="mt-2">
                  <PhotoPicker
                    onSelect={setPhotoFile}
                    label="장면 찍어 담기"
                    existingUrl={photoSignedUrl}
                    onRemoveExisting={() => setPhotoRemoved(true)}
                  />
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
                        label={record.childName ? `${record.childName}의 목소리로 남기기` : "목소리로 남기기"}
                        existingUrl={voiceSignedUrl}
                        onRemoveExisting={() => setVoiceRemoved(true)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--berry)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={saving || deleting}
          onClick={save}
          className="d mt-4 w-full rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          {saving ? "저장 중..." : "✓ 기록 저장하기"}
        </button>

        {confirmingDelete ? (
          <div className="mt-3">
            <p className="text-xs" style={{ color: "var(--berry)" }}>
              이 기록을 삭제하면 되돌릴 수 없어요.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmingDelete(false)}
                className="d flex-1 rounded-[14px] border py-3 text-sm disabled:opacity-40"
                style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={deleteRecord}
                className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
                style={{ background: "var(--berry)" }}
              >
                {deleting ? "삭제 중..." : "정말 삭제할까요?"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={saving || deleting}
            onClick={deleteRecord}
            className="d mt-3 w-full rounded-[14px] border py-3 text-sm disabled:opacity-40"
            style={{ borderColor: "var(--rule)", background: "var(--paper)", color: "var(--ink-2)" }}
          >
            이 기록 삭제하기
          </button>
        )}
      </div>
    </div>
  );
}
