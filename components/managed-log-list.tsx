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
  /** 맨 왼쪽 순번(1부터). 안 주면 번호 칸이 없다. */
  index?: number;
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
  /** 삭제할 때 실제로 지울 행 id들(안 주면 [id]). 같은 책이 여러 목록에 있을 때 "전체"에서 빼면 전부. */
  deleteIds?: string[];
  /** 추천도서 줄의 책 id -- "목록에 넣기"에 쓴다. */
  bookId?: string;
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
  deleteLabel = "삭제",
  listTargets,
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
  deleteLabel?: string;
  /** 추천도서: 고른 책을 넣을 수 있는 다른 목록들(있으면 선택 바에 "목록에 넣기"). */
  listTargets?: { id: string; name: string }[];
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
    const ids = rows.filter((r) => picked.has(r.id)).flatMap((r) => r.deleteIds ?? [r.id]);
    const { error: dbError } = await supabase.from(table).delete().in("id", ids);
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    stop();
    router.refresh();
  }

  async function addToList(listId: string) {
    const bookIds = rows.filter((r) => picked.has(r.id) && r.bookId).map((r) => r.bookId!);
    if (!listId || bookIds.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // 이미 그 목록에 있는 책은 조용히 건너뛴다(book_list_id+book_id 유니크, 0014).
    const { error: dbError } = await supabase
      .from("book_list_items")
      .upsert(
        bookIds.map((bookId) => ({ book_list_id: listId, book_id: bookId, required: false })),
        { onConflict: "book_list_id,book_id", ignoreDuplicates: true }
      );
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
              index={row.index}
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
              {deleteLabel}
            </button>
          </span>
        </div>
      )}
      {selecting && listTargets && listTargets.length > 0 && (
        <div className="flex items-center justify-end gap-2 px-4 pb-3" style={{ background: "rgba(47,168,79,0.06)" }}>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            고른 책을
          </span>
          <select
            value=""
            disabled={picked.size === 0 || busy}
            onChange={(e) => addToList(e.target.value)}
            aria-label="고른 책을 넣을 목록"
            className="d max-w-[180px] truncate rounded-full border px-2.5 py-1 text-xs outline-none disabled:opacity-40"
            style={{ borderColor: "var(--point)", background: "var(--card)", color: "var(--point-deep)" }}
          >
            <option value="">목록에 넣기 ▾</option>
            {listTargets.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </LogGroup>
  );
}
