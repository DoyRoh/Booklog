"use client";

/**
 * 내보내기 두 갈래 -- 엑셀(CSV)로 파일 내려받기, 그리고 브라우저 인쇄
 * (미리보기에서 "PDF로 저장"·공유 시트로 이어짐). 표지 이미지가 외부
 * 도메인이라 캔버스 캡처는 CORS에 막히지만 인쇄는 제약이 없다.
 */
export default function ExportButtons({ filename, rows }: { filename: string; rows: string[][] }) {
  function downloadCsv() {
    // 엑셀이 한글을 깨뜨리지 않도록 BOM을 붙이고, 줄바꿈은 CRLF로.
    const body = rows
      .map((row) => row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // 사파리가 아직 읽고 있을 수 있어 곧바로 해제하지 않는다.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <span className="no-print flex flex-none items-center gap-2">
      <button
        type="button"
        onClick={downloadCsv}
        className="d flex-none whitespace-nowrap rounded-[14px] border px-3 py-2 text-sm"
        style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--point-deep)" }}
      >
        엑셀(CSV)
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="d flex-none whitespace-nowrap rounded-[14px] px-3 py-2 text-sm text-white"
        style={{ background: "var(--point)" }}
      >
        인쇄 · PDF
      </button>
    </span>
  );
}
