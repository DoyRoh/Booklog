"use client";

import { useState } from "react";
import type { RecommendBook } from "@/lib/recommend-books";

const STATUS_LABEL: Record<"want" | "reading" | "done", string> = {
  done: "읽음",
  reading: "읽는 중",
  want: "읽고 싶음",
};

/** 숲지기가 아이 한 명의 추천도서 읽기 현황을 보는 자리 -- 그룹당 추천도서가
 * 100권 가까이 될 수 있어, 책마다 큰 배지(등불·발자국 도장)로 하나하나
 * 늘어놓는 건 소모적이라는 지적(사용자: "그냥 전체 몇 권 중 몇 권 읽었다
 * 정도면 되고 원하면 자세히 보기가 되어야 함"). 기본은 접혀 있고, 펼치면
 * 아이 화면의 화려한 배지 대신 제목·상태만 있는 작은 표 형태로 보여준다
 * (숲지기가 보는 관리 화면이라 체계적인 목록이 우선이라는 지적 반영). */
export default function ChildBookTracker({ books }: { books: RecommendBook[] }) {
  const [open, setOpen] = useState(false);

  if (books.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        아직 추천도서가 없어요.
      </p>
    );
  }

  return (
    <div>
      <div className="px-[24px] py-[10px]">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs" style={{ color: "var(--point-deep)" }}>
          {open ? "접기 ‹" : "책별로 자세히 보기 ›"}
        </button>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}>
          {books.map((book, index) => (
            <div
              key={book.itemId}
              className="flex items-center justify-between gap-2 px-[24px] py-[8px] text-xs"
              style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.06)" } : undefined}
            >
              <span className="min-w-0 flex-1 truncate" style={{ color: "var(--ink)" }}>
                {book.title}
                {book.inAssignment && <span style={{ color: "var(--ink-2)" }}> · 숙제 중</span>}
              </span>
              <span
                className="flex-none"
                style={{ color: book.readStatus === "done" ? "var(--point-deep)" : "var(--ink-2)" }}
              >
                {book.readStatus ? STATUS_LABEL[book.readStatus] : "아직"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
