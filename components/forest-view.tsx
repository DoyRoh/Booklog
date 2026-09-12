"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Illustration, { AvatarIllustration, type Avatar } from "@/components/illustration";
import ForestOrnament from "@/components/forest-ornament";
import type { Badge } from "@/lib/badges";
import type { MilestoneMemo } from "@/lib/badge-data";
import { ORNAMENT_LABEL } from "@/lib/forest-scene";
import { KEEPER_MAX, keeperIllustration } from "@/lib/keeper-scene";
import type { OperatorAvatar } from "@/lib/active-profile";
import { buildForestItems, milestoneTreeArt, type ForestItem } from "@/lib/forest-items";

// 우리 숲 = 딴 배지를 한 장면으로 그린 것. "숲이 자라요"(권수) 배지 하나가
// 나무 한 그루, 나머지 배지는 별·등불·새·발자국 장식. 책 한 권마다 나무를
// 심으면 몇백 그루가 돼 버려서(사용자 지적), 배지 단위로만 심는다 --
// 최대 38그루 + 장식 27개. 배치 규칙(buildForestItems)과 나무 그림
// (milestoneTreeArt)은 오늘 탭 미리보기(forest-strip.tsx)와 공유해서 두
// 화면이 똑같은 그림을 그린다.

export default function ForestView({
  childName,
  avatar,
  badges,
  groups = [],
  milestoneMemos = {},
}: {
  childName: string;
  avatar: Avatar | null | undefined;
  badges: Badge[];
  /** 속한 그룹(숲지기)들 -- 숲길 끝에 그룹마다 한 명씩, 그 그룹이 고른 얼굴로 선다. */
  groups?: { id: string; name: string; avatar: OperatorAvatar | null }[];
  /** 나무(권수 마일스톤)를 심을 때 남긴 책 제목·메모 한 줄. */
  milestoneMemos?: Record<number, MilestoneMemo>;
}) {
  // 숲길 끝의 숲지기: 그룹마다 한 명, 그 그룹이 실제로 고른 얼굴(곰/백로)로.
  // 자리를 너무 차지하지 않게 최대 KEEPER_MAX명까지만 세운다.
  const keepers = groups.length
    ? groups.slice(0, KEEPER_MAX)
    : [{ id: "guide", name: "길잡이", avatar: null as OperatorAvatar | null }];
  const [picked, setPicked] = useState<ForestItem | null>(null);

  const items = useMemo(() => buildForestItems(badges), [badges]);
  const treeCount = useMemo(() => items.filter((i) => i.kind === "tree").length, [items]);
  const achieved = badges.filter((b) => b.achieved).length;

  if (achieved === 0) {
    return (
      <div>
        <p className="hand text-xl" style={{ color: "var(--point-deep)" }}>
          {childName}의 숲은 아직 빈 들판이에요
        </p>
        <div
          className="mt-4 flex items-end justify-center gap-3 rounded-[var(--r)] px-4 pt-10 pb-6"
          style={{ background: "var(--sprout-pale)" }}
        >
          <AvatarIllustration avatar={avatar} height={96} />
          {keepers.map((g, i) => (
            <Illustration key={g.id} name={keeperIllustration(g.avatar)} height={i === 0 ? 120 : 96} />
          ))}
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          첫 책을 다 읽으면 ‘씨앗 하나’ 배지와 함께 첫 나무가 심겨요. 배지를 딸 때마다 나무·별·등불이 늘어나요.
        </p>
        <Link
          href="/library/add"
          className="d mt-4 block rounded-[14px] py-3 text-center text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          첫 나무 심으러 가기
        </Link>
        <Link href="/forest/3d" className="d mt-3 block text-center text-sm" style={{ color: "var(--point-deep)" }}>
          빈 들판을 3D로 둘러보기 ›
        </Link>
      </div>
    );
  }

  const skyStars = Math.min(6, 2 + Math.floor(treeCount / 5));

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
          {childName}의 숲에 나무 {treeCount}그루가 자랐어요
        </p>
        <span className="flex flex-none items-center gap-2">
          <span className="d text-sm" style={{ color: "var(--ink-2)" }}>
            배지 {achieved} / {badges.length}
          </span>
          <Link
            href="/forest/3d"
            className="d rounded-full px-3 py-1 text-xs text-white"
            style={{ background: "var(--point-deep)" }}
          >
            3D 숲 ›
          </Link>
        </span>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        배지를 딸 때마다 나무와 별, 등불이 늘어나요. 눌러 보면 어떤 배지인지 알려줘요.
      </p>

      <div
        className="mt-4 flex min-h-[52px] items-center gap-3 rounded-[16px] border px-4 py-2.5"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        aria-live="polite"
      >
        {picked ? (
          <>
            <span className="flex h-9 w-9 flex-none items-center justify-center">
              {picked.kind === "tree" ? (
                <Illustration name={milestoneTreeArt(picked.badge.count ?? 1).name} height={32} />
              ) : (
                <ForestOrnament kind={picked.ornament} avatar={avatar} inline />
              )}
            </span>
            <div className="min-w-0">
              <p className="d truncate text-sm">{picked.badge.label}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {picked.badge.description} 배지로 심은 {picked.kind === "tree" ? "나무" : ORNAMENT_LABEL[picked.ornament]}
              </p>
              {picked.kind === "tree" && milestoneMemos[picked.badge.count ?? -1] && (
                <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                  「{milestoneMemos[picked.badge.count ?? -1].title}」
                  {milestoneMemos[picked.badge.count ?? -1].memo
                    ? ` · "${milestoneMemos[picked.badge.count ?? -1].memo}"`
                    : ""}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            나무나 장식을 누르면 어떤 배지인지 알려줘요.
          </p>
        )}
      </div>

      <div
        className="relative mt-3 overflow-hidden rounded-[var(--r)] px-3 pt-10 pb-4"
        style={{ background: "var(--sprout-pale)" }}
      >
        {Array.from({ length: skyStars }, (_, i) => (
          <Illustration
            key={i}
            name="star"
            height={i % 2 ? 9 : 11}
            className="absolute"
            style={{ left: `${(i * 37 + 7) % 92}%`, top: `${6 + ((i * 13) % 14)}px`, opacity: 0.8 }}
          />
        ))}
        {/* "첫 숲지기"/"숲지기 셋" 배지는 아래 나무 사이 장식(items)의
            group1/group3 -> bear 매핑으로 그린다(딴 배지 하나 = 장식 하나).
            숲길 끝의 실제 숲지기 캐릭터(keepers, 아래)는 이것과 별개 --
            "몇 명 배지를 땄는가"가 아니라 "지금 실제로 속한 그룹이 몇 곳이고
            각각 누구인가"를 그대로 보여준다. */}

        <div className="flex flex-wrap items-end gap-x-1.5 gap-y-4">
          {items.map((item) => {
            const active = picked?.key === item.key;
            if (item.kind === "tree") {
              const tree = milestoneTreeArt(item.badge.count ?? 1);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPicked(active ? null : item)}
                  aria-label={`${item.badge.label} 배지의 나무`}
                  className="flex-none rounded-md transition-transform"
                  style={{
                    transform: active ? "scale(1.18)" : undefined,
                    filter: active ? "drop-shadow(0 2px 3px rgba(38,54,43,0.35))" : undefined,
                  }}
                >
                  <Illustration name={tree.name} height={tree.height} />
                </button>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPicked(active ? null : item)}
                aria-label={`${item.badge.label} 배지의 ${ORNAMENT_LABEL[item.ornament]}`}
                className="flex flex-none items-end rounded-md px-0.5 transition-transform"
                style={{ filter: active ? "drop-shadow(0 2px 3px rgba(38,54,43,0.35))" : undefined }}
              >
                <ForestOrnament kind={item.ornament} avatar={avatar} big={active} />
              </button>
            );
          })}
          <span className="ml-auto flex flex-none items-end gap-1 pl-2">
            <AvatarIllustration avatar={avatar} height={56} />
            {keepers.map((g, i) => (
              <span key={g.id} title={`${g.name} 숲지기`} style={{ marginLeft: i > 0 ? -10 : 0 }}>
                <Illustration name={keeperIllustration(g.avatar)} height={i === 0 ? 72 : 60} />
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
