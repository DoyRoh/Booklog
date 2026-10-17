"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AddBookToList from "@/components/add-book-to-list";
import { AGE_BANDS, AGE_BAND_LABELS, type AgeBand } from "@/lib/age-bands";
import { BOOK_CATEGORIES, categoryColor } from "@/lib/categories";
import { shortMd } from "@/components/log-row";
import type { OperatorBook } from "@/lib/operator-books";

const AGE_SHORT: Record<AgeBand, string> = { infant: "0~3", preschool: "4~7", lower: "저", upper: "고", teen: "청" };

type Edit = { ageBands?: AgeBand[]; categories?: string[]; note?: string };
type SortKey = "added" | "title" | "read" | "age";

/**
 * 숲지기의 추천도서 "엑셀 같은" 관리 표. 칸을 눌러 바로 고친다 --
 * 추천 연령은 칸 안의 작은 버튼을 누르는 즉시 저장, 분야는 칸을 눌러 펼친 칩,
 * 메모는 칸에 바로 쓰고 칸을 벗어나면 저장. 여러 권을 체크해 연령을 한 번에
 * 붙이거나 한꺼번에 뺄 수 있고, 위의 "책 바로 추가"는 이 화면을 떠나지 않고
 * 책을 올린다. 표가 넓어서 가로로 넘기고, 제목 칸은 왼쪽에 고정된다.
 */
export default function BookTable({
  groupId,
  listId,
  memberCount,
  books,
}: {
  groupId: string;
  listId: string | null;
  memberCount: number;
  books: OperatorBook[];
}) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "added", dir: -1 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const view = useMemo(
    () =>
      books.map((b) => ({
        ...b,
        ageBands: edits[b.itemId]?.ageBands ?? b.ageBands,
        categories: edits[b.itemId]?.categories ?? b.categories,
        note: edits[b.itemId]?.note ?? b.note,
      })),
    [books, edits]
  );

  const sorted = useMemo(() => {
    const list = [...view];
    const { key, dir } = sort;
    list.sort((a, b) => {
      let r = 0;
      if (key === "title") r = a.title.localeCompare(b.title, "ko");
      else if (key === "read") r = a.readCount - b.readCount;
      else if (key === "age") r = (a.ageBands.length ? AGE_BANDS.indexOf(a.ageBands[0]) : 99) - (b.ageBands.length ? AGE_BANDS.indexOf(b.ageBands[0]) : 99);
      else r = a.addedAt.localeCompare(b.addedAt);
      return r * dir;
    });
    return list;
  }, [view, sort]);

  function setEdit(itemId: string, patch: Edit) {
    setEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  async function saveAges(itemId: string, next: AgeBand[]) {
    const prevEdit = edits[itemId]?.ageBands;
    setEdit(itemId, { ageBands: next });
    const { error: dbError } = await createClient()
      .from("book_list_items")
      .update({ age_bands: next.length ? next : null })
      .eq("id", itemId);
    if (dbError) {
      setEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ageBands: prevEdit } }));
      setError(/age_bands/.test(dbError.message) ? "추천 연령 기능을 쓰려면 데이터베이스 업데이트(0038)가 필요해요." : dbError.message);
    } else {
      setError(null);
    }
  }

  function toggleAge(book: OperatorBook, band: AgeBand) {
    const cur = edits[book.itemId]?.ageBands ?? book.ageBands;
    const next = AGE_BANDS.filter((b) => (b === band ? !cur.includes(b) : cur.includes(b)));
    void saveAges(book.itemId, next);
  }

  async function toggleCategory(book: OperatorBook, category: string) {
    const cur = edits[book.itemId]?.categories ?? book.categories;
    const has = cur.includes(category);
    const next = has ? cur.filter((c) => c !== category) : [...cur, category];
    setEdit(book.itemId, { categories: next });
    const supabase = createClient();
    const { error: dbError } = has
      ? await supabase.from("book_categories").delete().eq("book_id", book.bookId).eq("category", category)
      : await supabase.from("book_categories").upsert({ book_id: book.bookId, category }, { onConflict: "book_id,category", ignoreDuplicates: true });
    if (dbError) {
      setEdit(book.itemId, { categories: cur });
      setError(dbError.message);
    } else {
      setError(null);
    }
  }

  async function saveNote(book: OperatorBook, value: string) {
    const cur = edits[book.itemId]?.note ?? book.note;
    if (value.trim() === cur.trim()) return;
    setEdit(book.itemId, { note: value.trim() });
    const { error: dbError } = await createClient()
      .from("book_list_items")
      .update({ note: value.trim() || null })
      .eq("id", book.itemId);
    if (dbError) {
      setEdit(book.itemId, { note: cur });
      setError(/note/.test(dbError.message) ? "추천 메모를 쓰려면 데이터베이스 업데이트(0039)가 필요해요." : dbError.message);
    } else {
      setError(null);
    }
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "title" || key === "age" ? 1 : -1 }));
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allPicked = sorted.length > 0 && picked.size === sorted.length;

  // 선택한 책 모두에 이 연령이 있으면 빼고, 아니면 모두에 붙인다.
  async function bulkAge(band: AgeBand) {
    if (picked.size === 0 || busy) return;
    setBusy(true);
    const targets = view.filter((b) => picked.has(b.itemId));
    const remove = targets.every((b) => b.ageBands.includes(band));
    await Promise.all(
      targets.map((b) =>
        saveAges(
          b.itemId,
          AGE_BANDS.filter((x) => (x === band ? !remove : b.ageBands.includes(x)))
        )
      )
    );
    setBusy(false);
  }

  async function bulkDelete() {
    if (picked.size === 0 || busy) return;
    if (!window.confirm(`${picked.size}권을 추천도서에서 뺄까요? (아이들의 기록은 남아요)`)) return;
    setBusy(true);
    const { error: dbError } = await createClient().from("book_list_items").delete().in("id", Array.from(picked));
    setBusy(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setPicked(new Set());
    router.refresh();
  }

  const th = "whitespace-nowrap px-2 py-2 text-left text-[11px] font-normal";
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "");

  return (
    <div className="mt-[12px]">
      {/* 이 화면을 떠나지 않고 바로 책을 올린다 */}
      {listId && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="d w-full rounded-[14px] py-2.5 text-sm text-white"
            style={{ background: "var(--point-deep)" }}
            aria-expanded={adding}
          >
            {adding ? "책 추가 닫기" : "+ 책 바로 추가"}
          </button>
          {adding && (
            <div className="mt-3 rounded-[var(--r)] border p-4" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
              <AddBookToList bookListIds={[listId]} />
            </div>
          )}
        </div>
      )}

      {/* 선택한 책에 한꺼번에 */}
      {picked.size > 0 && (
        <div className="sticky z-10 mb-2 flex flex-wrap items-center gap-2 rounded-[14px] border px-3 py-2" style={{ top: "calc(52px + var(--st) + 82px)", borderColor: "var(--point)", background: "var(--card)" }}>
          <span className="d text-xs">{picked.size}권 선택</span>
          <span className="text-[11px]" style={{ color: "var(--ink-2)" }}>연령</span>
          {AGE_BANDS.map((band) => (
            <button
              key={band}
              type="button"
              disabled={busy}
              onClick={() => bulkAge(band)}
              title={`선택한 책의 ${AGE_BAND_LABELS[band]} 추천을 붙이거나 빼요`}
              className="rounded-full border px-2.5 py-1 text-[11px] disabled:opacity-40"
              style={{ borderColor: "var(--rule)" }}
            >
              {AGE_BAND_LABELS[band]}
            </button>
          ))}
          <button type="button" disabled={busy} onClick={bulkDelete} className="d ml-auto rounded-full px-3 py-1 text-[11px] text-white disabled:opacity-40" style={{ background: "var(--berry)" }}>
            삭제
          </button>
          <button type="button" onClick={() => setPicked(new Set())} className="text-[11px]" style={{ color: "var(--ink-2)" }}>
            해제
          </button>
        </div>
      )}

      {error && (
        <p className="mb-2 text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}

      <div className="-mx-5 overflow-x-auto px-5 pb-1">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 rounded-[var(--r)] border text-sm" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
          <thead>
            <tr style={{ color: "var(--ink-2)", background: "var(--paper)" }}>
              <th className={`${th} sticky left-0 z-[1] w-9`} style={{ background: "var(--paper)" }}>
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(sorted.map((b) => b.itemId)))}
                  aria-label="모두 선택"
                />
              </th>
              <th className={`${th} sticky left-9 z-[1] min-w-[190px]`} style={{ background: "var(--paper)" }}>
                <button type="button" onClick={() => toggleSort("title")}>제목{arrow("title")}</button>
              </th>
              <th className={th}>
                <button type="button" onClick={() => toggleSort("age")}>추천 연령{arrow("age")}</button>
              </th>
              <th className={th}>분야</th>
              <th className={`${th} min-w-[170px]`}>추천 메모</th>
              <th className={th}>
                <button type="button" onClick={() => toggleSort("read")}>읽음{arrow("read")}</button>
              </th>
              <th className={th}>
                <button type="button" onClick={() => toggleSort("added")}>올린 날{arrow("added")}</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((book) => {
              const checked = picked.has(book.itemId);
              const cellBorder = { borderTop: "1px solid rgba(38,54,43,0.08)" } as const;
              const rowBg = checked ? "rgba(47,168,79,0.08)" : "var(--card)";
              return (
                <tr key={book.itemId} style={{ background: rowBg }}>
                  <td className="sticky left-0 z-[1] px-2 py-2 align-middle" style={{ ...cellBorder, background: rowBg }}>
                    <input type="checkbox" checked={checked} onChange={() => togglePick(book.itemId)} aria-label={`${book.title} 선택`} />
                  </td>
                  <td className="sticky left-9 z-[1] px-2 py-2 align-middle" style={{ ...cellBorder, background: rowBg }}>
                    <Link href={`/teacher/books/${book.bookId}?group=${groupId}`} className="block">
                      <span className="d block text-[13px] leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>
                        {book.title}
                      </span>
                      {book.author && (
                        <span className="block truncate text-[11px]" style={{ color: "var(--ink-2)" }}>
                          {book.author}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-2 py-2 align-middle" style={cellBorder}>
                    <div className="flex gap-1">
                      {AGE_BANDS.map((band) => {
                        const on = book.ageBands.includes(band);
                        return (
                          <button
                            key={band}
                            type="button"
                            onClick={() => toggleAge(book, band)}
                            aria-pressed={on}
                            title={AGE_BAND_LABELS[band]}
                            className="h-7 min-w-7 rounded-full border px-1.5 text-[11px]"
                            style={{
                              borderColor: on ? "var(--point-deep)" : "var(--rule)",
                              background: on ? "var(--point-deep)" : "transparent",
                              color: on ? "#fff" : "var(--ink-2)",
                            }}
                          >
                            {AGE_SHORT[band]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="relative px-2 py-2 align-middle" style={cellBorder}>
                    <button type="button" onClick={() => setOpenCat(openCat === book.itemId ? null : book.itemId)} className="flex min-h-7 max-w-[130px] flex-wrap gap-1 text-left" aria-expanded={openCat === book.itemId}>
                      {book.categories.length === 0 ? (
                        <span className="rounded-full border border-dashed px-2 py-0.5 text-[11px]" style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}>
                          + 분야
                        </span>
                      ) : (
                        book.categories.map((c) => (
                          <span key={c} className="rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: categoryColor(c) }}>
                            {c}
                          </span>
                        ))
                      )}
                    </button>
                    {openCat === book.itemId && (
                      <div className="absolute left-2 top-full z-20 mt-1 flex w-[220px] flex-wrap gap-1.5 rounded-[14px] border p-2.5" style={{ borderColor: "var(--rule)", background: "var(--card)", boxShadow: "0 8px 20px rgba(38,54,43,0.18)" }}>
                        {BOOK_CATEGORIES.map((c) => {
                          const on = book.categories.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleCategory(book, c)}
                              aria-pressed={on}
                              className="rounded-full border px-2.5 py-1 text-[11px]"
                              style={{ borderColor: on ? categoryColor(c) : "var(--rule)", background: on ? categoryColor(c) : "transparent", color: on ? "#fff" : "var(--ink-2)" }}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 align-middle" style={cellBorder}>
                    <input
                      type="text"
                      defaultValue={book.note}
                      key={`${book.itemId}:${book.note}`}
                      maxLength={500}
                      placeholder="왜 추천하나요?"
                      onBlur={(e) => void saveNote(book, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      className="w-full min-w-0 rounded-[8px] border border-transparent bg-transparent px-1.5 py-1 text-[12px] outline-none focus:border-[color:var(--point)] focus:bg-white"
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 align-middle text-[12px]" style={{ ...cellBorder, color: book.readCount > 0 ? "var(--point-deep)" : "var(--ink-2)" }}>
                    {book.inAssignment && <span title="진행 중인 숙제에 들어 있어요" style={{ color: "var(--lantern)" }}>● </span>}
                    {book.readCount}/{memberCount}명
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 align-middle text-[11px]" style={{ ...cellBorder, color: "var(--ink-2)" }}>
                    {shortMd(book.addedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px]" style={{ color: "var(--ink-2)" }}>
        칸을 눌러 바로 고쳐요 · 체크한 책은 연령을 한 번에 붙이거나 뺄 수 있어요 · 제목을 누르면 아이별 읽은 현황
      </p>
    </div>
  );
}
