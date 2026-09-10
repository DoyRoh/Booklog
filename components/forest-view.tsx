"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Illustration, {
  AvatarIllustration,
  PawStamp,
  type Avatar,
  type IllustrationName,
} from "@/components/illustration";
import type { Badge } from "@/lib/badges";
import { ORNAMENT_BY_BADGE, ORNAMENT_LABEL, type OrnamentKind } from "@/lib/forest-scene";

// 우리 숲 = 딴 배지를 한 장면으로 그린 것. "숲이 자라요"(권수) 배지 하나가
// 나무 한 그루, 나머지 배지는 별·등불·새·발자국 장식. 책 한 권마다 나무를
// 심으면 몇백 그루가 돼 버려서(사용자 지적), 배지 단위로만 심는다 --
// 최대 38그루 + 장식 27개.
// 권수 배지의 나무 -- 권수가 커질수록 다른 종류·더 큰 나무.
function milestoneTree(count: number): { name: IllustrationName; height: number } {
  if (count < 10) return { name: "tree-light", height: 36 };
  if (count < 50) return { name: "tree-bushy", height: 42 };
  if (count < 100) return { name: "tree-round", height: 48 };
  if (count < 200) return { name: "tree-pine", height: 54 };
  if (count < 500) return { name: "tree-round", height: 56 };
  return { name: "tree-pine", height: 64 };
}

type Item =
  | { kind: "tree"; key: string; badge: Badge }
  | { kind: "ornament"; key: string; badge: Badge; ornament: OrnamentKind };

function Ornament({
  kind,
  avatar,
  big,
  inline,
}: {
  kind: OrnamentKind;
  avatar: Avatar | null | undefined;
  big?: boolean;
  inline?: boolean;
}) {
  const s = big ? 1.18 : 1;
  switch (kind) {
    case "star":
      return <Illustration name="star" height={Math.round(14 * s)} style={{ marginBottom: inline ? 0 : 30 }} />;
    case "lantern":
      return <Illustration name="lantern-on" height={Math.round(30 * s)} />;
    case "bird-letter":
      return <Illustration name="bird-letter" height={Math.round(26 * s)} style={{ marginBottom: inline ? 0 : 22 }} />;
    case "bird-perched":
      return <Illustration name="bird-perched" height={Math.round(38 * s)} />;
    case "paw":
      return <PawStamp avatar={avatar} height={Math.round(20 * s)} style={{ marginBottom: 2, opacity: 0.85 }} />;
  }
}

export default function ForestView({
  childName,
  avatar,
  badges,
}: {
  childName: string;
  avatar: Avatar | null | undefined;
  badges: Badge[];
}) {
  const [picked, setPicked] = useState<Item | null>(null);

  const trees = useMemo(() => badges.filter((b) => b.achieved && b.count !== undefined), [badges]);
  const ornaments = useMemo(
    () =>
      badges
        .filter((b) => b.achieved && b.count === undefined && ORNAMENT_BY_BADGE[b.id])
        .map((b) => ({ badge: b, ornament: ORNAMENT_BY_BADGE[b.id] })),
    [badges]
  );
  const achieved = badges.filter((b) => b.achieved).length;

  // 나무 사이사이에 장식을 고르게 끼워 넣는다.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const every = ornaments.length ? Math.max(1, Math.floor(trees.length / (ornaments.length + 1))) : Infinity;
    let oi = 0;
    trees.forEach((badge, i) => {
      out.push({ kind: "tree", key: badge.id, badge });
      if ((i + 1) % every === 0 && oi < ornaments.length) {
        const o = ornaments[oi++];
        out.push({ kind: "ornament", key: o.badge.id, badge: o.badge, ornament: o.ornament });
      }
    });
    while (oi < ornaments.length) {
      const o = ornaments[oi++];
      out.push({ kind: "ornament", key: o.badge.id, badge: o.badge, ornament: o.ornament });
    }
    return out;
  }, [trees, ornaments]);

  if (achieved === 0) {
    return (
      <div>
        <p className="hand text-xl" style={{ color: "var(--point-deep)" }}>
          {childName}의 숲은 아직 빈 들판이에요
        </p>
        <div
          className="mt-4 flex items-end justify-center gap-3 rounded-[var(--r)] px-4 pt-10 pb-6"
          style={{ background: "#DCE6D0" }}
        >
          <AvatarIllustration avatar={avatar} height={96} />
          <Illustration name="bear-lantern" height={120} />
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

  const skyStars = Math.min(6, 2 + Math.floor(trees.length / 5));

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
          {childName}의 숲에 나무 {trees.length}그루가 자랐어요
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
                <Illustration name={milestoneTree(picked.badge.count ?? 1).name} height={32} />
              ) : (
                <Ornament kind={picked.ornament} avatar={avatar} inline />
              )}
            </span>
            <div className="min-w-0">
              <p className="d truncate text-sm">{picked.badge.label}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {picked.badge.description} 배지로 심은 {picked.kind === "tree" ? "나무" : ORNAMENT_LABEL[picked.ornament]}
              </p>
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
        style={{ background: "#DCE6D0" }}
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

        <div className="flex flex-wrap items-end gap-x-1.5 gap-y-4">
          {items.map((item) => {
            const active = picked?.key === item.key;
            if (item.kind === "tree") {
              const tree = milestoneTree(item.badge.count ?? 1);
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
                <Ornament kind={item.ornament} avatar={avatar} big={active} />
              </button>
            );
          })}
          <span className="ml-auto flex flex-none items-end gap-1 pl-2">
            <AvatarIllustration avatar={avatar} height={56} />
            <Illustration name="bear-lantern" height={72} />
          </span>
        </div>
      </div>
    </div>
  );
}
