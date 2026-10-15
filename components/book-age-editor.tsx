"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AgeBandPicker from "@/components/age-band-picker";
import type { AgeBand } from "@/lib/age-bands";

/** 숲지기 책 상세의 "추천 연령" -- 칩을 누르면 바로 저장(이미 올린 책도 연령을 붙일 수 있게). */
export default function BookAgeEditor({ itemId, initial }: { itemId: string; initial: AgeBand[] }) {
  const router = useRouter();
  const [value, setValue] = useState<AgeBand[]>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function change(next: AgeBand[]) {
    const prev = value;
    setValue(next);
    setState("saving");
    const { error } = await createClient()
      .from("book_list_items")
      .update({ age_bands: next.length ? next : null })
      .eq("id", itemId);
    if (error) {
      setValue(prev);
      setState("error");
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <div>
      <AgeBandPicker value={value} onChange={change} />
      <p className="mt-2 text-xs" style={{ color: state === "error" ? "var(--berry)" : "var(--ink-2)" }}>
        {state === "saving"
          ? "저장 중…"
          : state === "saved"
            ? "저장했어요."
            : state === "error"
              ? "저장하지 못했어요. 다시 눌러 주세요."
              : value.length === 0
                ? "아직 연령 미정이에요. 아이 화면에서 흐리게 하지 않아요."
                : "이 나이가 아닌 아이에게는 흐리게 보여요."}
      </p>
    </div>
  );
}
