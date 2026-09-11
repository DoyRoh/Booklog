"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tag = { id: string; name: string };

// "6살 책장", "여름방학 책장"처럼 부모가 직접 이름 붙인 책장(shelf_tags)을
// 고르거나 새로 만드는 칩 목록. 기록 남기기(app/library/add)와 기록
// 고치기(RecordEditModal) 양쪽에서 재사용한다.
export default function ShelfTagPicker({
  childId,
  value,
  onChange,
  label = "어느 책장에 꽂을까요? (선택)",
}: {
  childId: string;
  value: string | null;
  onChange: (tagId: string | null) => void;
  /** 쓰는 자리마다 묻는 말이 달라서(기록 화면 vs 책장 정리) 바꿔 끼운다. */
  label?: string;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("shelf_tags")
      .select("id, name")
      .eq("child_id", childId)
      .order("name")
      .then(({ data }) => setTags((data as Tag[] | null) ?? []));
  }, [childId]);

  async function createTag() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("shelf_tags")
      .insert({ child_id: childId, name: newName.trim() })
      .select("id, name")
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "이미 있는 책장 이름이에요." : insertError.message);
      return;
    }
    const tag = data as Tag;
    setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name, "ko")));
    onChange(tag.id);
    setNewName("");
    setAdding(false);
  }

  return (
    <div>
      <p className="d text-sm">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className="d rounded-full border px-3 py-1.5 text-sm"
          style={{
            borderColor: value === null ? "var(--point)" : "var(--rule)",
            background: value === null ? "rgba(47,168,79,0.08)" : "var(--card)",
            color: value === null ? "var(--point-deep)" : "var(--ink)",
          }}
        >
          없음
        </button>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onChange(tag.id)}
            className="d rounded-full border px-3 py-1.5 text-sm"
            style={{
              borderColor: value === tag.id ? "var(--point)" : "var(--rule)",
              background: value === tag.id ? "rgba(47,168,79,0.08)" : "var(--card)",
              color: value === tag.id ? "var(--point-deep)" : "var(--ink)",
            }}
          >
            {tag.name}
          </button>
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="d rounded-full border border-dashed px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
          >
            + 새 책장
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="예: 6살 책장"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="min-w-0 flex-1 rounded-[14px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--rule)" }}
          />
          <button
            type="button"
            disabled={!newName.trim() || saving}
            onClick={createTag}
            className="d rounded-[14px] px-3 py-2 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            추가
          </button>
        </div>
      )}
      {error && (
        <p className="mt-1 text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
