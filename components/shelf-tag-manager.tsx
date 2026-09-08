"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tag = { id: string; name: string };

// 더보기의 "책장 이름표" 섹션 -- 활성 아이의 이름표를 이름 바꾸기/삭제할
// 수 있다. 만들기는 기록 화면의 ShelfTagPicker에서 그때그때 하지만,
// 오타를 고치거나 안 쓰는 이름표를 지울 곳이 여기 말고는 없다.
export default function ShelfTagManager({ childId }: { childId: string }) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("shelf_tags")
      .select("id, name")
      .eq("child_id", childId)
      .order("name")
      .then(({ data }) => {
        setTags((data as Tag[] | null) ?? []);
        setLoaded(true);
      });
  }, [childId]);

  async function rename(tag: Tag) {
    const name = draft.trim();
    if (!name || name === tag.name) {
      setEditingId(null);
      return;
    }
    setBusy(tag.id);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("shelf_tags").update({ name }).eq("id", tag.id);
    setBusy(null);
    if (updateError) {
      setError(updateError.code === "23505" ? "이미 있는 이름표예요." : updateError.message);
      return;
    }
    setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, name } : t)));
    setEditingId(null);
    router.refresh();
  }

  async function remove(tag: Tag) {
    if (!window.confirm(`"${tag.name}" 이름표를 지울까요? 붙어 있던 책의 기록은 그대로 남고 이름표만 떨어져요.`)) return;
    setBusy(tag.id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("shelf_tags").delete().eq("id", tag.id);
    setBusy(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    router.refresh();
  }

  if (!loaded) return null;

  if (tags.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        아직 이름표가 없어요. 기록을 남길 때 &quot;+ 새 이름표&quot;로 만들 수 있어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex items-center gap-2 rounded-[var(--r)] border px-4 py-3"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {editingId === tag.id ? (
            <>
              <input
                type="text"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(tag);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 rounded-[14px] border px-3 py-1.5 text-sm outline-none"
                style={{ borderColor: "var(--rule)" }}
              />
              <button
                type="button"
                disabled={busy === tag.id}
                onClick={() => rename(tag)}
                className="d rounded-full px-3 py-1 text-xs text-white disabled:opacity-40"
                style={{ background: "var(--point)" }}
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
              >
                취소
              </button>
            </>
          ) : (
            <>
              <p className="d flex-1 text-sm">{tag.name}</p>
              <button
                type="button"
                onClick={() => {
                  setEditingId(tag.id);
                  setDraft(tag.name);
                }}
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
              >
                이름 바꾸기
              </button>
              <button
                type="button"
                disabled={busy === tag.id}
                onClick={() => remove(tag)}
                className="rounded-full border px-3 py-1 text-xs disabled:opacity-40"
                style={{ borderColor: "var(--rule)", color: "var(--berry)" }}
              >
                삭제
              </button>
            </>
          )}
        </div>
      ))}
      {error && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
