"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { effectiveRange } from "@/lib/assignment-period";
import { missionChip } from "@/lib/assignment-chip";
import { kstDate } from "@/lib/kst";
import { shortMd } from "@/components/log-row";

export type AssignmentTableRow = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  bookTitles: string[];
  missions: { type: string }[];
  completed: number;
  total: number;
};

type Filter = "current" | "past" | "all";
type SortKey = "due" | "title" | "done";

/**
 * 숲지기의 숙제 "엑셀 같은" 관리 표. 제목과 마감일은 칸에서 바로 고치고(칸을 벗어나면
 * 저장), 마감이 지난 숙제는 붉게, 진행 중/지난 숙제는 위 칩으로 거른다. 여러 개를
 * 체크해 마감일을 한꺼번에 바꾸거나 삭제할 수 있다. 새 숙제는 책·미션을 고르는
 * 별도 화면에서 만든다(위의 "+ 숙제").
 */
export default function AssignmentTable({ groupId, rows }: { groupId: string; rows: AssignmentTableRow[] }) {
  const router = useRouter();
  const today = kstDate();
  const [edits, setEdits] = useState<Record<string, { title?: string; endDate?: string }>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "due", dir: 1 });

  const view = useMemo(
    () =>
      rows.map((r) => {
        const e = edits[r.id];
        const merged = { ...r, title: e?.title ?? r.title, endDate: e?.endDate ?? r.endDate };
        return { ...merged, due: effectiveRange(merged).end, start: effectiveRange(merged).start };
      }),
    [rows, edits]
  );

  const currentCount = view.filter((r) => r.due >= today).length;
  const pastCount = view.length - currentCount;
  const [filter, setFilter] = useState<Filter>(currentCount > 0 || pastCount === 0 ? "current" : "all");

  const shown = useMemo(() => {
    const list = view.filter((r) => (filter === "all" ? true : filter === "current" ? r.due >= today : r.due < today));
    const { key, dir } = sort;
    list.sort((a, b) => {
      const r =
        key === "title"
          ? a.title.localeCompare(b.title, "ko")
          : key === "done"
            ? (a.total ? a.completed / a.total : 0) - (b.total ? b.completed / b.total : 0)
            : a.due.localeCompare(b.due);
      return r * dir;
    });
    return list;
  }, [view, filter, sort, today]);

  async function update(ids: string[], patch: { title?: string; end_date?: string }) {
    const { error: dbError } = await createClient().from("assignments").update(patch).in("id", ids);
    if (dbError) {
      setError(dbError.message);
      return false;
    }
    setError(null);
    return true;
  }

  async function saveTitle(id: string, current: string, value: string) {
    const next = value.trim();
    if (!next || next === current) return;
    setEdits((p) => ({ ...p, [id]: { ...p[id], title: next } }));
    if (!(await update([id], { title: next }))) setEdits((p) => ({ ...p, [id]: { ...p[id], title: current } }));
  }

  async function saveDue(id: string, current: string, value: string) {
    if (!value || value === current) return;
    setEdits((p) => ({ ...p, [id]: { ...p[id], endDate: value } }));
    if (!(await update([id], { end_date: value }))) setEdits((p) => ({ ...p, [id]: { ...p[id], endDate: undefined } }));
  }

  async function bulkSetDue() {
    if (!bulkDate || picked.size === 0 || busy) return;
    setBusy(true);
    const ids = Array.from(picked);
    if (await update(ids, { end_date: bulkDate })) {
      setEdits((p) => {
        const next = { ...p };
        for (const id of ids) next[id] = { ...next[id], endDate: bulkDate };
        return next;
      });
      setPicked(new Set());
      setBulkDate("");
    }
    setBusy(false);
  }

  async function bulkDelete() {
    if (picked.size === 0 || busy) return;
    if (!window.confirm(`숙제 ${picked.size}개를 지울까요? (아이들의 독서기록은 남아요)`)) return;
    setBusy(true);
    const { error: dbError } = await createClient().from("assignments").delete().in("id", Array.from(picked));
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setPicked(new Set());
    router.refresh();
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "done" ? -1 : 1 }));
  }
  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allPicked = shown.length > 0 && shown.every((r) => picked.has(r.id));
  const th = "whitespace-nowrap px-2 py-2 text-left text-[11px] font-normal";
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "");

  return (
    <div className="mt-[12px]">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {(
            [
              ["current", `진행 중 ${currentCount}`],
              ["past", `지난 숙제 ${pastCount}`],
              ["all", `전체 ${view.length}`],
            ] as const
          ).map(([key, label]) => {
            const on = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={on}
                className="d flex-none rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: on ? "var(--point-deep)" : "var(--rule)", background: on ? "var(--point-deep)" : "var(--card)", color: on ? "#fff" : "var(--ink-2)" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <Link href={`/teacher/assignments/new?group=${groupId}`} className="d flex-none rounded-full px-3.5 py-1.5 text-xs text-white" style={{ background: "var(--point-deep)" }}>
          + 숙제 만들기
        </Link>
      </div>

      {picked.size > 0 && (
        <div className="sticky z-10 mt-3 flex flex-wrap items-center gap-2 rounded-[14px] border px-3 py-2" style={{ top: "calc(52px + var(--st) + 82px)", borderColor: "var(--point)", background: "var(--card)" }}>
          <span className="d text-xs">{picked.size}개 선택</span>
          <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} min={today} aria-label="일괄 마감일" className="rounded-[8px] border px-2 py-1 text-xs" style={{ borderColor: "var(--rule)" }} />
          <button type="button" disabled={!bulkDate || busy} onClick={bulkSetDue} className="d rounded-full px-3 py-1 text-[11px] text-white disabled:opacity-40" style={{ background: "var(--point-deep)" }}>
            마감일 바꾸기
          </button>
          <button type="button" disabled={busy} onClick={bulkDelete} className="d ml-auto rounded-full px-3 py-1 text-[11px] text-white disabled:opacity-40" style={{ background: "var(--berry)" }}>
            삭제
          </button>
          <button type="button" onClick={() => setPicked(new Set())} className="text-[11px]" style={{ color: "var(--ink-2)" }}>
            해제
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          이 조건의 숙제가 없어요.
        </p>
      ) : (
        <div className="-mx-5 mt-3 overflow-x-auto px-5 pb-1">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 rounded-[var(--r)] border text-sm" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
            <thead>
              <tr style={{ color: "var(--ink-2)", background: "var(--paper)" }}>
                <th className={`${th} sticky left-0 z-[1] w-9`} style={{ background: "var(--paper)" }}>
                  <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(shown.map((r) => r.id)))} aria-label="모두 선택" />
                </th>
                <th className={`${th} sticky left-9 z-[1] min-w-[190px]`} style={{ background: "var(--paper)" }}>
                  <button type="button" onClick={() => toggleSort("title")}>제목{arrow("title")}</button>
                </th>
                <th className={th}>
                  <button type="button" onClick={() => toggleSort("due")}>마감일{arrow("due")}</button>
                </th>
                <th className={th}>낸 날</th>
                <th className={th}>종류</th>
                <th className={`${th} min-w-[150px]`}>읽을 책</th>
                <th className={th}>
                  <button type="button" onClick={() => toggleSort("done")}>완료{arrow("done")}</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const checked = picked.has(r.id);
                const overdue = r.due < today && r.total > 0 && r.completed < r.total;
                const rowBg = checked ? "rgba(47,168,79,0.08)" : "var(--card)";
                const cellBorder = { borderTop: "1px solid rgba(38,54,43,0.08)" } as const;
                const chip = missionChip(r.missions);
                const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0;
                return (
                  <tr key={r.id} style={{ background: rowBg }}>
                    <td className="sticky left-0 z-[1] px-2 py-2 align-middle" style={{ ...cellBorder, background: rowBg }}>
                      <input type="checkbox" checked={checked} onChange={() => togglePick(r.id)} aria-label={`${r.title} 선택`} />
                    </td>
                    <td className="sticky left-9 z-[1] px-2 py-1.5 align-middle" style={{ ...cellBorder, background: rowBg }}>
                      <input
                        type="text"
                        defaultValue={r.title}
                        key={`${r.id}:${r.title}`}
                        onBlur={(e) => void saveTitle(r.id, r.title, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="d w-full min-w-0 rounded-[8px] border border-transparent bg-transparent px-1.5 py-1 text-[13px] outline-none focus:border-[color:var(--point)] focus:bg-white"
                      />
                      <Link href={`/teacher/assignments/${r.id}`} className="ml-1.5 text-[11px]" style={{ color: "var(--point-deep)" }}>
                        아이별 현황 ›
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 align-middle" style={cellBorder}>
                      <input
                        type="date"
                        defaultValue={r.due}
                        key={`${r.id}:${r.due}`}
                        onBlur={(e) => void saveDue(r.id, r.due, e.target.value)}
                        className="rounded-[8px] border border-transparent bg-transparent px-1.5 py-1 text-[12px] outline-none focus:border-[color:var(--point)] focus:bg-white"
                        style={{ color: overdue ? "var(--berry)" : "var(--ink)", width: 128 }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 align-middle text-[11px]" style={{ ...cellBorder, color: "var(--ink-2)" }}>
                      {shortMd(r.start)}
                    </td>
                    <td className="px-2 py-2 align-middle" style={cellBorder}>
                      <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: chip.color }}>
                        {chip.label}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-2 py-2 align-middle text-[12px]" style={{ ...cellBorder, color: "var(--ink-2)" }}>
                      <span className="block truncate">{r.bookTitles.length ? r.bookTitles.join(" · ") : "-"}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 align-middle text-[12px]" style={cellBorder}>
                      <span style={{ color: r.total > 0 && r.completed === r.total ? "var(--point-deep)" : overdue ? "var(--berry)" : "var(--ink)" }}>
                        {r.completed}/{r.total}명
                      </span>
                      <span className="mt-1 block h-1 w-16 overflow-hidden rounded-full" style={{ background: "var(--rule)" }}>
                        <span className="block h-full" style={{ width: `${pct}%`, background: overdue ? "var(--berry)" : "var(--point)" }} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px]" style={{ color: "var(--ink-2)" }}>
        제목과 마감일은 칸을 눌러 바로 고쳐요 · 체크한 숙제는 마감일을 한 번에 바꾸거나 지울 수 있어요
      </p>
    </div>
  );
}
