"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AgeBandPicker from "@/components/age-band-picker";
import { BOOK_CATEGORIES } from "@/lib/categories";
import type { AgeBand } from "@/lib/age-bands";

/**
 * 숲지기 책 상세의 "추천 정보" -- 추천 연령(그룹 목록의 책), 분야(공용 카탈로그),
 * 숲지기 설명(그룹 목록의 책)을 한 번에 고쳐 저장한다.
 * hasAges/hasNote: 마이그레이션 0038(연령)·0039(설명)이 실행됐는지 -- 안 된 칸은 숨긴다.
 */
export default function BookRecommendEditor({
  itemId,
  bookId,
  initialAges,
  initialCategories,
  initialNote,
  hasAges,
  hasNote,
}: {
  itemId: string;
  bookId: string;
  initialAges: AgeBand[];
  initialCategories: string[];
  initialNote: string;
  hasAges: boolean;
  hasNote: boolean;
}) {
  const router = useRouter();
  const [ages, setAges] = useState<AgeBand[]>(initialAges);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState({ ages: initialAges, categories: initialCategories, note: initialNote });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty =
    ages.join() !== saved.ages.join() ||
    [...categories].sort().join() !== [...saved.categories].sort().join() ||
    note.trim() !== saved.note.trim();

  // 표준 분야 + 이 책에 이미 붙어 있는 다른 분야(지우지 않고 보여 준다).
  const options = [...BOOK_CATEGORIES, ...initialCategories.filter((c) => !(BOOK_CATEGORIES as readonly string[]).includes(c))];

  function toggleCategory(c: string) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setState("idle");
  }

  async function save() {
    setState("saving");
    setError(null);
    const supabase = createClient();

    if (hasAges || hasNote) {
      const { error: itemError } = await supabase
        .from("book_list_items")
        .update({
          ...(hasAges ? { age_bands: ages.length ? ages : null } : {}),
          ...(hasNote ? { note: note.trim() || null } : {}),
        })
        .eq("id", itemId);
      if (itemError) {
        setError(itemError.message);
        setState("error");
        return;
      }
    }

    const added = categories.filter((c) => !saved.categories.includes(c));
    const removed = saved.categories.filter((c) => !categories.includes(c));
    if (added.length) {
      const { error: e } = await supabase
        .from("book_categories")
        .upsert(added.map((category) => ({ book_id: bookId, category })), { onConflict: "book_id,category", ignoreDuplicates: true });
      if (e) {
        setError(e.message);
        setState("error");
        return;
      }
    }
    if (removed.length) {
      const { error: e } = await supabase.from("book_categories").delete().eq("book_id", bookId).in("category", removed);
      if (e) {
        setError(e.message);
        setState("error");
        return;
      }
    }

    setSaved({ ages, categories, note: note.trim() });
    setNote(note.trim());
    setState("saved");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {hasAges && (
        <div>
          <p className="d text-xs" style={{ color: "var(--ink-2)" }}>
            추천 연령 <span style={{ opacity: 0.7 }}>· 여러 개 고를 수 있어요. 비우면 연령 미정</span>
          </p>
          <div className="mt-1.5">
            <AgeBandPicker
              value={ages}
              onChange={(v) => {
                setAges(v);
                setState("idle");
              }}
            />
          </div>
        </div>
      )}

      <div>
        <p className="d text-xs" style={{ color: "var(--ink-2)" }}>
          분야 <span style={{ opacity: 0.7 }}>· 여러 개 고를 수 있어요</span>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {options.map((c) => {
            const on = categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                aria-pressed={on}
                className="d rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: on ? "var(--point)" : "var(--rule)",
                  background: on ? "rgba(47,168,79,0.08)" : "transparent",
                  color: on ? "var(--point-deep)" : "var(--ink-2)",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {hasNote && (
        <label className="block">
          <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
            설명 <span style={{ opacity: 0.7 }}>· 왜 이 책을 추천하는지 (선택)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setState("idle");
            }}
            rows={3}
            maxLength={500}
            placeholder="예: 동생이 생긴 아이에게 읽어 주기 좋아요."
            className="mt-1.5 block w-full min-w-0 rounded-[14px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === "saving"}
          className="d rounded-[14px] px-5 py-2.5 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point-deep)" }}
        >
          {state === "saving" ? "저장 중…" : "저장"}
        </button>
        {state === "saved" && !dirty && (
          <span className="text-xs" style={{ color: "var(--point-deep)" }}>
            저장했어요.
          </span>
        )}
        {error && (
          <span className="text-xs" style={{ color: "var(--berry)" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
