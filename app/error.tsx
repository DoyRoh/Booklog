"use client";

import Link from "next/link";
import { DB_TIMEOUT_MESSAGE } from "@/lib/supabase/fetch-with-timeout";

// 화면을 그리다 예외가 나면(대표적으로 DB 시간 초과) 흰 화면 대신 이 안내.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const timeout = error.message?.includes("응답하지 않아요");
  return (
    <div className="mx-auto max-w-[520px] px-5 pt-16 text-center">
      <p className="hand text-xl" style={{ color: "var(--point-deep)" }}>
        {timeout ? "숲이 잠시 조용하네요" : "길을 잠깐 잃었어요"}
      </p>
      <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
        {timeout ? DB_TIMEOUT_MESSAGE : "화면을 불러오다 문제가 생겼어요. 다시 시도해 주세요."}
      </p>
      {!timeout && error.digest ? (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
          오류 코드 {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="d mt-6 w-full rounded-[14px] py-3 text-sm text-white"
        style={{ background: "var(--point)" }}
      >
        다시 시도
      </button>
      <Link href="/today" className="d mt-3 block text-sm" style={{ color: "var(--point-deep)" }}>
        오늘 화면으로
      </Link>
    </div>
  );
}
