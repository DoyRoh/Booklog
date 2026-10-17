"use client";

import { useState } from "react";

// 그룹 소개글 -- 길면 세 줄까지만 보여주고 눌러서 더 본다. 추천도서 책장
// 맨 위와 그룹 상세에서 같이 쓴다.
export default function GroupIntro({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 90 || text.split("\n").length > 3;
  return (
    <div className={className}>
      <p
        className="whitespace-pre-line text-sm leading-relaxed"
        style={{
          color: "var(--ink)",
          overflowWrap: "anywhere",
          ...(open || !long ? {} : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }),
        }}
      >
        {text}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs" style={{ color: "var(--point-deep)" }}>
          {open ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}
