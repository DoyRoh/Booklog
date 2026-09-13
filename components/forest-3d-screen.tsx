"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Avatar } from "@/components/illustration";
import type { Badge } from "@/lib/badges";
import type { MilestoneMemo } from "@/lib/badge-data";
import { layoutForest, ORNAMENT_LABEL_3D, ORNAMENT_COUNTER, type OrnamentKind } from "@/lib/forest-scene";
import type { Mood } from "@/components/forest-3d";
import type { OperatorAvatar } from "@/lib/active-profile";

// three.js는 무거워서 이 화면에서만, 브라우저에서만 불러온다.
const Forest3D = dynamic(() => import("@/components/forest-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--ink-2)" }}>
      숲을 빚는 중이에요…
    </div>
  ),
});

export default function Forest3DScreen({
  childName,
  avatar,
  badges,
  groups = [],
  milestoneMemos = {},
}: {
  childName: string;
  avatar: Avatar | null | undefined;
  badges: Badge[];
  /** 속한 그룹(숲지기)들 -- 그룹마다 한 명, 그 그룹이 고른 얼굴로 선다. */
  groups?: { id: string; name: string; avatar: OperatorAvatar | null }[];
  /** 나무(권수 마일스톤)를 심을 때 남긴 책 제목·메모 한 줄. */
  milestoneMemos?: Record<number, MilestoneMemo>;
}) {
  const [mood, setMood] = useState<Mood>("day");
  const [picked, setPicked] = useState<string | null>(null);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAnimate(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const items = useMemo(() => layoutForest(badges), [badges]);
  const pickedItem = items.find((i) => i.key === picked) ?? null;

  const counts = useMemo(() => {
    const c: Partial<Record<OrnamentKind, number>> & { tree: number } = { tree: 0 };
    for (const it of items) {
      if (it.kind === "tree") c.tree += 1;
      else c[it.ornament] = (c[it.ornament] ?? 0) + 1;
    }
    return c;
  }, [items]);

  // 나비·무당벌레·달팽이·곰(첫 숲지기 배지) 등 새로 생긴 종류도 그때그때
  // 이름을 붙여 세도록, 배지 장식 표(ORNAMENT_LABEL_3D)를 그대로 훑는다.
  const summary = [
    counts.tree ? `나무 ${counts.tree}그루` : null,
    ...(Object.keys(ORNAMENT_LABEL_3D) as OrnamentKind[])
      .filter((kind) => counts[kind])
      .map((kind) => `${ORNAMENT_LABEL_3D[kind]} ${counts[kind]}${ORNAMENT_COUNTER[kind]}`),
    groups.length > 1 ? `숲지기 ${groups.length}명` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
          {items.length === 0 ? `${childName}의 숲은 아직 빈 들판이에요` : `${childName}의 숲을 걸어 볼까요`}
        </p>
        <div className="flex flex-none overflow-hidden rounded-full border text-xs" style={{ borderColor: "var(--rule)" }}>
          {(["day", "night"] as Mood[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className="d px-3 py-1.5"
              style={{
                background: mood === m ? "var(--point-deep)" : "var(--card)",
                color: mood === m ? "#fff" : "var(--ink-2)",
              }}
            >
              {m === "day" ? "낮" : "밤"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        {summary || "첫 책을 다 읽으면 첫 나무가 심겨요."} 손가락으로 돌리고, 벌려서 가까이 보고, 나무를 눌러 보세요.
      </p>

      <div
        className="mt-4 flex min-h-[52px] items-center gap-3 rounded-[16px] border px-4 py-2.5"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        aria-live="polite"
      >
        {pickedItem ? (
          <div className="min-w-0">
            <p className="d truncate text-sm">{pickedItem.badge.label}</p>
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>
              {pickedItem.badge.description} 배지로 {pickedItem.kind === "tree" ? "심은 나무" : `얻은 ${ORNAMENT_LABEL_3D[pickedItem.ornament]}`}
            </p>
            {pickedItem.kind === "tree" && milestoneMemos[pickedItem.badge.count ?? -1] && (
              <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                「{milestoneMemos[pickedItem.badge.count ?? -1].title}」
                {milestoneMemos[pickedItem.badge.count ?? -1].memo
                  ? ` · "${milestoneMemos[pickedItem.badge.count ?? -1].memo}"`
                  : ""}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            숲의 나무·별·등불·새·버섯은 전부 {childName}이(가) 딴 배지예요. 하나를 누르면 어떤 배지인지 알려줘요.
          </p>
        )}
      </div>

      <div
        className="mt-4 h-[62vh] min-h-[380px] overflow-hidden rounded-[var(--r)] border"
        style={{ borderColor: "var(--rule)", background: mood === "day" ? "#EAF0E5" : "#1B2A22" }}
      >
        <Forest3D items={items} avatar={avatar} groups={groups} mood={mood} animate={animate} picked={picked} onPick={setPicked} />
      </div>
    </div>
  );
}
