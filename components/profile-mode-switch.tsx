"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 더보기 → 프로필 맨 위의 큰 전환 스위치: "아이 프로필로 보기 / 숲지기로
 * 보기". 예전엔 아이 카드·그룹 카드를 눌러야 바뀌었는데 눌러도 반응이
 * 없어 보이고(같은 카드면 아무 일도 안 함) 어느 쪽이 켜져 있는지도
 * 알기 어려웠다. 여기서 누르면 "전환 중…"이 보이고, 끝나면 그 프로필의
 * 첫 화면(오늘 / 숲지기 대시보드)으로 이동한다.
 */
export default function ProfileModeSwitch({
  userId,
  mode,
  childName,
  operatorName,
  hasChild,
  hasOperator,
}: {
  userId: string;
  mode: "child" | "operator";
  childName: string | null;
  operatorName: string | null;
  hasChild: boolean;
  hasOperator: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"child" | "operator" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function switchTo(next: "child" | "operator") {
    if (busyRef.current) return;
    const home = next === "child" ? "/today" : "/teacher";
    if (next === mode) {
      // 이미 그 프로필이면 그냥 그 화면으로 -- "눌렀는데 아무 일도 없다"를 없앤다.
      router.push(home);
      return;
    }
    // 전환은 화면 전체가 바뀌는 큰 동작이라 한 번 묻는다(아이·숲지기 공통).
    const label = next === "child" ? childName ?? "아이" : operatorName ?? "숲지기";
    if (!window.confirm(`${label} 프로필로 전환하시겠어요?`)) return;
    busyRef.current = true;
    setBusy(next);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ active_profile_type: next })
      .eq("id", userId);
    busyRef.current = false;
    if (updateError) {
      setBusy(null);
      setError(updateError.message);
      return;
    }
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.push(home);
    router.refresh();
  }

  const tile = (active: boolean) => ({
    borderColor: active ? "var(--point)" : "var(--rule)",
    background: active ? "rgba(47,168,79,0.10)" : "var(--paper)",
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!hasChild || busy !== null}
          onClick={() => switchTo("child")}
          className="flex flex-col items-start gap-1 rounded-[16px] border px-3 py-3 text-left disabled:opacity-50"
          style={tile(mode === "child")}
        >
          <span className="text-[11px]" style={{ color: "var(--ink-2)" }}>
            아이 프로필
          </span>
          <span className="d text-sm">{childName ?? "아이 없음"}</span>
          <span className="d text-[11px]" style={{ color: mode === "child" ? "var(--point-deep)" : "var(--ink-2)" }}>
            {busy === "child" ? "전환 중…" : mode === "child" ? "지금 보는 중 · 오늘 탭으로 ›" : "이 프로필로 보기 ›"}
          </span>
        </button>

        {hasOperator ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => switchTo("operator")}
            className="flex flex-col items-start gap-1 rounded-[16px] border px-3 py-3 text-left disabled:opacity-50"
            style={tile(mode === "operator")}
          >
            <span className="text-[11px]" style={{ color: "var(--ink-2)" }}>
              숲지기 프로필
            </span>
            <span className="d text-sm">{operatorName ?? "이름 없음"}</span>
            <span className="d text-[11px]" style={{ color: mode === "operator" ? "var(--point-deep)" : "var(--ink-2)" }}>
              {busy === "operator" ? "전환 중…" : mode === "operator" ? "지금 보는 중 · 대시보드로 ›" : "이 프로필로 보기 ›"}
            </span>
          </button>
        ) : (
          <Link
            href="/recommend/create"
            className="flex flex-col items-start gap-1 rounded-[16px] border border-dashed px-3 py-3 text-left"
            style={{ borderColor: "var(--rule)" }}
          >
            <span className="text-[11px]" style={{ color: "var(--ink-2)" }}>
              숲지기 프로필
            </span>
            <span className="d text-sm">아직 없어요</span>
            <span className="d text-[11px]" style={{ color: "var(--point-deep)" }}>
              그룹 만들고 숲지기 되기 ›
            </span>
          </Link>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
