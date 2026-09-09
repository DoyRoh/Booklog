"use client";

import { useState } from "react";
import { BADGE_SECTIONS, type Badge } from "@/lib/badges";
import BadgeArt from "@/components/badge-art";
import type { Avatar } from "@/components/illustration";

// 권수 배지가 38개라(1·5·10~200·250~1000) 전부 펼치면 화면이 너무 길어져서,
// "숲이 자라요" 섹션은 딴 것 + 다음 3개만 보여주고 나머지는 접어 둔다.
const FOREST_PREVIEW_AHEAD = 3;

function BadgeTile({ badge, avatar }: { badge: Badge; avatar: Avatar | null | undefined }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-[var(--r)] border p-3 text-center"
      style={{
        borderColor: badge.achieved ? "var(--point)" : "var(--rule)",
        background: badge.achieved ? "rgba(47,168,79,0.06)" : "var(--card)",
      }}
    >
      <BadgeArt id={badge.id} count={badge.count} avatar={avatar} achieved={badge.achieved} />
      <span className="d text-xs" style={{ wordBreak: "keep-all" }}>
        {badge.label}
      </span>
      <span className="text-[10px]" style={{ color: "var(--ink-2)" }}>
        {badge.description}
      </span>
    </div>
  );
}

export default function BadgeGrid({ badges, avatar }: { badges: Badge[]; avatar: Avatar | null | undefined }) {
  const [forestOpen, setForestOpen] = useState(false);

  return (
    <div className="mt-6 flex flex-col gap-7">
      {BADGE_SECTIONS.map((section) => {
        const all = badges.filter((b) => b.section === section.key);
        const achievedCount = all.filter((b) => b.achieved).length;
        let shown = all;
        let hidden = 0;
        if (section.key === "forest" && !forestOpen) {
          const cut = Math.min(all.length, achievedCount + FOREST_PREVIEW_AHEAD);
          shown = all.slice(0, cut);
          hidden = all.length - cut;
        }
        return (
          <section key={section.key}>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="d text-base">{section.title}</p>
                <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {section.hint}
                </p>
              </div>
              <span className="d flex-none text-xs" style={{ color: "var(--ink-2)" }}>
                {achievedCount} / {all.length}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {shown.map((badge) => (
                <BadgeTile key={badge.id} badge={badge} avatar={avatar} />
              ))}
            </div>
            {section.key === "forest" && (hidden > 0 || forestOpen) && (
              <button
                type="button"
                onClick={() => setForestOpen((v) => !v)}
                className="d mt-3 w-full rounded-[14px] border py-2.5 text-xs"
                style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink-2)" }}
              >
                {forestOpen ? "접기" : `천 그루 숲까지 ${hidden}개 더 보기`}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
