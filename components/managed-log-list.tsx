"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Illustration from "@/components/illustration";
import { LogGroup, LogRow, type LogChip } from "@/components/log-row";

export type ManagedRow = {
  /** 삭제할 때 쓰는 행 id(book_list_items.id / assignments.id). */
  id: string;
  href: string;
  dateTop: string;
  dateBottom?: string;
  hideDate?: boolean;
  chip: LogChip;
  title: string;
  titleBold?: boolean;
  subtitle?: string;
  /** "숙제 중" 등불 표시. */
  lantern?: boolean;
  right?: string;
  rightTone?: "good" | "muted";
};

/**
 * 숲지기의 그룹별 목록(추천도서·숙제) 한 묶음. 머리글 오른쪽의 "선택"을
 * 누르면 줄마다 동그라미 체크가 나오고, 아래에 "N개 선택 · 삭제" 바가 뜬다.
 * 관리(특히 삭제)가 자유로워야 한다는 요청 -- 상세로 들어가 하나씩 지우지
 * 않고 목록에서 바로 여러 개를 고른다.
 */
export default function ManagedLogList({
  heading,
  headingSub,
  addHref,
  addLabel,
  rows,
  emptyText,
  table,
  deleteNoun,
  preview,
}: {
  heading: string;
  headingSub?: string;
  addHref: string;
  addLabel: string;
  rows: ManagedRow[];
  emptyText: string;
  table: "book_list_items" | "assignments";
  /** 확인 문구용: "추천도서에서 뺄까요" / "숙제를 지울까요" */
  deleteNoun: string;
  /**
   * 미리보기 모드: 머리글 오른쪽은 "관리 ›" 링크 하나뿐이고(추가·선택 없음),
   * 전체가 rows보다 많으면 맨 아래에 "나머지 N권 전체 보기 ›"가 붙는다.
   */
  preview?: { href: string; total: number };
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stop() {
    setSelecting(false);
    setPicked(new Set());
    setError(null);
  }

  async function remove() {
    if (picked.size === 0 || busy) return;
    if (!window.confirm(`${picked.size}개를 ${deleteNoun}?`)) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from(table).delete().in("id", Array.from(picked));
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    stop();
    router.refresh();
  }

  const allPicked = rows.length > 0 && picked.size === rows.length;

  return (
    <LogGroup
      heading={heading}
      headingSub={headingSub}
      headingRight={
        preview ? (
          <Link href={preview.href} className="d" style={{ color: "var(--point)" }}>
            관리 ›
          </Link>
        ) : (
        <span className="flex items-center gap-3">
          {!selecting && (
            <Link href={addHref} className="d" style={{ color: "var(--point)" }}>
              {addLabel}
            </Link>
          )}
          {rows.length > 0 && (
            <button type="button" onClick={selecting ? stop : () => setSelecting(true)} className="d" style={{ color: "var(--ink-2)" }}>
              {selecting ? "취소" : "선택"}
            </button>
          )}
        </span>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm" style={{ color: "var(--ink-2)" }}>
          {emptyText}
        </p>
      ) : (
        rows.map((row, index) => {
          const checked = picked.has(row.id);
          return (
            <LogRow
              key={row.id}
              first={index === 0}
              hideDate={row.hideDate}
              href={selecting ? undefined : row.href}
              onClick={selecting ? () => toggle(row.id) : undefined}
              dateTop={row.dateTop}
              dateBottom={row.dateBottom}
              chip={row.chip}
              title={row.titleBold ? <span className="d">{row.title}</span> : row.title}
              subtitle={
                row.subtitle || row.lantern ? (
                  <>
                    {row.lantern && (
                      <span className="mr-1.5 inline-flex items-center gap-0.5 align-middle" style={{ color: "var(--lantern)" }}>
                        <Illustration name="lantern-on" height={13} />
                        숙제 중
                      </span>
                    )}
                    {row.subtitle}
                  </>
                ) : undefined
              }
              right={
                selecting ? (
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border"
                    style={{
                      borderColor: checked ? "var(--point)" : "var(--rule)",
                      background: checked ? "var(--point)" : "var(--card)",
                    }}
                  >
                    {checked && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </span>
                ) : row.right ? (
                  <span
                    className="d rounded-full px-2 py-0.5 text-[11px]"
                    style={{
                      background: row.rightTone === "good" ? "rgba(47,168,79,0.12)" : "var(--paper)",
                      color: row.rightTone === "good" ? "var(--point-deep)" : "var(--ink-2)",
                    }}
                  >
                    {row.right}
                  </span>
                ) : undefined
              }
            />
          );
        })
      )}

      {preview && preview.total > rows.length && (
        <Link
          href={preview.href}
          className="d block px-4 py-3 text-center text-xs"
          style={{ borderTop: "1px solid rgba(38,54,43,0.08)", color: "var(--point-deep)" }}
        >
          나머지 {preview.total - rows.length}권 · 전체 보기 ›
        </Link>
      )}

      {selecting && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderTop: "1px solid rgba(38,54,43,0.08)", background: "rgba(47,168,79,0.06)" }}
        >
          <button
            type="button"
            onClick={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))}
            className="d text-xs"
            style={{ color: "var(--point-deep)" }}
          >
            {allPicked ? "모두 해제" : "모두 선택"}
          </button>
          <span className="flex items-center gap-3">
            {error && (
              <span className="text-xs" style={{ color: "var(--berry)" }}>
                {error}
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              {picked.size}개 선택
            </span>
            <button
              type="button"
              disabled={picked.size === 0 || busy}
              onClick={remove}
              className="d rounded-[14px] px-3 py-1.5 text-xs text-white disabled:opacity-40"
              style={{ background: "var(--berry)" }}
            >
              삭제
            </button>
          </span>
        </div>
      )}
    </LogGroup>
  );
}
