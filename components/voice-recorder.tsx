"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onRecorded: (blob: Blob) => void;
  onClear?: () => void;
  label?: string;
  // 기록 고치기 모달처럼 이미 업로드된 녹음이 있을 때, 그걸 재생할 수 있게
  // 보여주고 다시 녹음하거나 지울 수 있게 한다. 새로 녹음하면 onRecorded로
  // 그 blob이 넘어가고(부모가 새로 업로드), 지우면 onRemoveExisting이
  // 한 번 불린다(부모가 voice_url을 null로 저장).
  existingUrl?: string | null;
  onRemoveExisting?: () => void;
};

const MIME_CANDIDATES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

export default function VoiceRecorder({
  onRecorded,
  onClear,
  label = "음성 녹음 시작",
  existingUrl = null,
  onRemoveExisting,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingRemoved, setExistingRemoved] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      // 브라우저마다 녹음 형식이 다르다 -- 아이폰 사파리는 audio/mp4(AAC)만,
      // 크롬/안드로이드는 audio/webm(Opus). 예전엔 무조건 "audio/webm"으로
      // 이름 붙여 올려서 아이폰에서 녹음한 파일이 아이폰에서 "오류"로 안
      // 열렸다. 지원하는 형식을 골라 녹음하고, 그 형식 그대로 저장한다.
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = (recorder.mimeType || mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunksRef.current, { type });
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        onRecorded(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setPermissionDenied(true);
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function reRecord() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    onClear?.();
  }

  function removeExisting() {
    setExistingRemoved(true);
    onRemoveExisting?.();
  }

  const showingExisting = !previewUrl && !recording && !existingRemoved && Boolean(existingUrl);

  return (
    <div className="flex flex-col gap-2">
      {!previewUrl && !recording && !showingExisting && (
        <button
          type="button"
          onClick={start}
          className="d self-start rounded-[14px] border px-4 py-2.5 text-sm"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {label}
        </button>
      )}

      {showingExisting && (
        <div className="flex items-center gap-3">
          <audio src={existingUrl!} controls className="h-9 min-w-0 flex-1" />
          <button type="button" onClick={start} className="d flex-none whitespace-nowrap text-sm" style={{ color: "var(--point)" }}>
            다시 녹음
          </button>
          {onRemoveExisting && (
            <button type="button" onClick={removeExisting} className="d flex-none whitespace-nowrap text-sm" style={{ color: "var(--berry)" }}>
              지우기
            </button>
          )}
        </div>
      )}

      {recording && (
        <button
          type="button"
          onClick={stop}
          className="d self-start rounded-[14px] px-4 py-2.5 text-sm text-white"
          style={{ background: "var(--berry)" }}
        >
          녹음 중... 눌러서 멈추기
        </button>
      )}

      {previewUrl && (
        <div className="flex items-center gap-3">
          <audio src={previewUrl} controls className="h-9 min-w-0 flex-1" />
          <button
            type="button"
            onClick={reRecord}
            className="d flex-none whitespace-nowrap text-sm"
            style={{ color: "var(--ink-2)" }}
          >
            다시 녹음
          </button>
        </div>
      )}

      {permissionDenied && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          마이크 권한이 필요해요. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
