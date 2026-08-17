"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";

type Props = {
  onDetected: (isbn: string) => void;
  onError?: (message: string) => void;
};

const ISBN_PATTERN = /^\d{8}$|^\d{13}$/;

export default function BarcodeScanner({ onDetected, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Refs so the scan loop always calls the latest callbacks without
  // needing to restart the camera stream on every parent re-render.
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  }, [onDetected, onError]);

  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]);
    const reader = new BrowserMultiFormatReader(hints);

    let cancelled = false;
    let controls: IScannerControls | undefined;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current ?? undefined,
        (result) => {
          if (cancelled || !result) return;
          const text = result.getText();
          if (ISBN_PATTERN.test(text)) {
            onDetectedRef.current(text);
          }
        }
      )
      .then((c) => {
        if (cancelled) {
          c.stop();
          return;
        }
        controls = c;
      })
      .catch((err) => {
        if (cancelled) return;
        setPermissionDenied(true);
        onErrorRef.current?.(
          err instanceof Error ? err.message : "카메라를 열 수 없어요."
        );
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-[var(--r)]" style={{ background: "#000" }}>
      <video ref={videoRef} className="w-full" playsInline muted />
      {permissionDenied && (
        <p className="p-4 text-sm text-white">
          카메라 권한이 필요해요. 브라우저 설정에서 허용한 뒤 새로고침 해주세요.
        </p>
      )}
    </div>
  );
}
