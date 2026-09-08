"use client";

import { useEffect, useState } from "react";
import { SPLASH_QUOTES } from "@/lib/splash-quotes";

const SESSION_KEY = "chaeksup:splash-shown";
const SHOW_MS = 2200;
const FADE_MS = 500;

// 페이지 로드당 한 번만 결정(모듈 스코프라 StrictMode 이중 실행에도 안전)
let decidedThisLoad: boolean | null = null;

// 앱을 켤 때 한 번만 뜨는 스플래시 -- 밤 숲 그림 위에 흰 손글씨 문구
// 하나(켤 때마다 돌아가며) + 책숲 로고. 윌라처럼 "켜는 순간의 한 장면".
//
// - 서버 렌더링에서는 그림만 보이게 두고(문구는 클라이언트에서 무작위로
//   고르므로 SSR과 어긋나면 안 됨), 마운트 뒤에 문구를 채운다.
// - 같은 브라우저 세션에서 이미 봤으면(sessionStorage) 바로 없앤다 --
//   탭 이동은 레이아웃이 유지돼 애초에 다시 마운트되지 않고, 새로고침
//   때만 이 검사가 의미 있다.
// - 탭하면 바로 닫힌다. 움직임 최소화 설정이면 페이드 없이 사라진다.
export default function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    // 이 페이지 로드에서 "보여줄지"는 딱 한 번만 정한다. React 개발 모드는
    // 효과를 두 번 실행하는데, 첫 실행이 플래그를 심고 두 번째 실행이 그걸
    // 보고 바로 지워 버리는 문제가 있었다(스크린샷으로 확인).
    if (decidedThisLoad === null) {
      let seen = false;
      try {
        seen = sessionStorage.getItem(SESSION_KEY) === "1";
      } catch {
        seen = false;
      }
      decidedThisLoad = !seen;
      if (!seen) {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* 시크릿 모드 등 -- 그냥 매번 보여준다 */
        }
      }
    }
    if (!decidedThisLoad) {
      setPhase("gone");
      return;
    }
    setQuote(SPLASH_QUOTES[Math.floor(Math.random() * SPLASH_QUOTES.length)]);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(() => setPhase("fading"), SHOW_MS);
    const t2 = setTimeout(() => setPhase("gone"), SHOW_MS + (reduce ? 0 : FADE_MS));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      role="presentation"
      onClick={() => setPhase("gone")}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden"
      style={{
        background: "#0F1F16 url(/illustrations/splash.jpg) center 55% / cover no-repeat",
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        paddingTop: "calc(var(--st, 0px) + 18vh)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)",
      }}
    >
      {/* 위쪽 하늘이 어두워서 흰 글자가 그대로 읽히지만, 폰 비율에 따라
          나무가 올라올 수 있어 아주 옅은 어두운 그림자만 한 겹 깐다. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
        style={{ background: "linear-gradient(rgba(15,31,22,0.45), rgba(15,31,22,0))" }}
      />
      <p
        className="hand relative whitespace-pre-line px-8 text-center leading-snug"
        style={{
          color: "#FFFFFF",
          fontSize: "clamp(24px, 6.6vw, 30px)",
          textShadow: "0 1px 12px rgba(0,0,0,0.35)",
          wordBreak: "keep-all",
          minHeight: "3em",
        }}
      >
        {quote ?? ""}
      </p>
      <span
        className="d relative text-2xl tracking-wide"
        style={{ color: "#FFFFFF", textShadow: "0 1px 10px rgba(0,0,0,0.4)" }}
      >
        책숲
      </span>
    </div>
  );
}
