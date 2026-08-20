"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onRecorded: (blob: Blob) => void;
  onClear?: () => void;
  label?: string;
};

export default function VoiceRecorder({ onRecorded, onClear, label = "음성 녹음 시작" }: Props) {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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

  return (
    <div className="flex flex-col gap-2">
      {!previewUrl && !recording && (
        <button
          type="button"
          onClick={start}
          className="d self-start rounded-[14px] border px-4 py-2.5 text-sm"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {label}
        </button>
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
          <audio src={previewUrl} controls className="h-9" />
          <button
            type="button"
            onClick={reRecord}
            className="d text-sm"
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
