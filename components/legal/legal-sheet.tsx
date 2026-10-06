"use client";

import { useEffect } from "react";
import TermsContent from "./terms-content";
import PrivacyContent from "./privacy-content";

// 온보딩에서 약관을 페이지 이동 없이 보여주는 아래 시트. 새 창(target=_blank)
// 으로 열면 앱에서는 사파리가 떠서, 돌아올 때 온보딩 입력이 초기화됐다.
export default function LegalSheet({
  doc,
  onClose,
}: {
  doc: "terms" | "privacy";
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="backdrop-in fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(20,30,24,0.45)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={doc === "terms" ? "이용약관" : "개인정보처리방침"}
    >
      <div
        className="sheet-up flex max-h-[88vh] w-full max-w-[560px] flex-col rounded-t-[var(--r)]"
        style={{ background: "var(--card)", paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-7">
          {doc === "terms" ? <TermsContent /> : <PrivacyContent linkSupport={false} />}
        </div>
        <div className="border-t px-6 py-3" style={{ borderColor: "var(--rule)" }}>
          <button
            type="button"
            onClick={onClose}
            className="d w-full rounded-[14px] py-3 text-sm text-white"
            style={{ background: "var(--point-deep)" }}
          >
            다 읽었어요
          </button>
        </div>
      </div>
    </div>
  );
}
