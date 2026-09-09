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

export type ForestTree = {
  id: string;
  bookId: string;
  title: string;
  readDate: string;
};

// 나무 모양·크기는 책 id 해시로 고정 배정한다 -- 같은 책은 언제 봐도
// 같은 나무라서, 아이가 "이 나무는 알사탕이야" 하고 기억할 수 있다.
const TREES: IllustrationName[] = ["tree-light", "tree-bushy", "tree-round", "tree-pine"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// 딴 배지 하나 = 숲의 장식 하나. 연속 기록은 별, 밤길 지킴이·숙제·추천도서는
// 등불, 사진·숲지기는 편지 새, 녹음은 앉은 새, 다시 읽기는 발자국.
// 권수 배지는 이미 나무 자체라 장식이 따로 없다.
type OrnamentKind = "star" | "lantern" | "bird-letter" | "bird-perched" | "paw";

const ORNAMENT_BY_BADGE: Record<string, OrnamentKind> = {
  d2: "star",
  d3: "star",
  week: "lantern",
  d14: "lantern",
  d30: "lantern",
  week10: "star",
  month20: "star",
  months3: "star",
  again: "paw",
  again3: "paw",
  same5: "paw",
  fav1: "star",
  fav5: "star",
  group1: "bird-letter",
  group3: "bird-letter",
  rec10: "lantern",
  rec30: "lantern",
  rec100: "lantern",
  hw1: "lantern",
  hw5: "lantern",
  hw20: "lantern",
  photo10: "bird-letter",
  photo30: "bird-letter",
  voice5: "bird-perched",
  voice20: "bird-perched",
  author10: "star",
  author30: "star",
};

const ORNAMENT_LABEL: Record<OrnamentKind, string> = {
  star: "별",
  lantern: "등불",
  "bird-letter": "편지 새",
  "bird-perched": "새",
  paw: "발자국",
};

type Item =
  | { kind: "tree"; key: string; tree: ForestTree }
  | { kind: "ornament"; key: string; badge: Badge; ornament: OrnamentKind };

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function Ornament({
  kind,
  avatar,
  big,
  inline,
}: {
  kind: OrnamentKind;
  avatar: Avatar | null | undefined;
  big?: boolean;
  /** 안내 카드 안처럼 바닥선이 없는 자리에서는 띄우지 않는다 */
  inline?: boolean;
}) {
  const s = big ? 1.18 : 1;
  switch (kind) {
    case "star":
      // 별은 나무 위 하늘에 떠 있게 -- 바닥선에서 띄운다
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
  trees,
  badges,
}: {
  childName: string;
  avatar: Avatar | null | undefined;
  trees: ForestTree[];
  badges: Badge[];
}) {
  const [picked, setPicked] = useState<Item | null>(null);

  const ornaments = useMemo(
    () =>
      badges
        .filter((b) => b.achieved && ORNAMENT_BY_BADGE[b.id])
        .map((b) => ({ badge: b, ornament: ORNAMENT_BY_BADGE[b.id] })),
    [badges]
  );

  // 나무 사이사이에 장식을 고르게 끼워 넣는다(나무 n그루, 장식 m개면 대략
  // n/(m+1)그루마다 하나). 나무보다 장식이 많으면 남는 건 뒤에 이어 붙인다.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const every = ornaments.length ? Math.max(1, Math.floor(trees.length / (ornaments.length + 1))) : Infinity;
    let oi = 0;
    trees.forEach((tree, i) => {
      out.push({ kind: "tree", key: tree.id, tree });
      if ((i + 1) % every === 0 && oi < ornaments.length) {
        const o = ornaments[oi++];
        out.push({ kind: "ornament", key: `o-${o.badge.id}`, badge: o.badge, ornament: o.ornament });
      }
    });
    while (oi < ornaments.length) {
      const o = ornaments[oi++];
      out.push({ kind: "ornament", key: `o-${o.badge.id}`, badge: o.badge, ornament: o.ornament });
    }
    return out;
  }, [trees, ornaments]);

  const tally = useMemo(() => {
    const counts = new Map<OrnamentKind, number>();
    for (const o of ornaments) counts.set(o.ornament, (counts.get(o.ornament) ?? 0) + 1);
    return (["star", "lantern", "bird-letter", "bird-perched", "paw"] as OrnamentKind[])
      .filter((k) => counts.get(k))
      .map((k) => `${ORNAMENT_LABEL[k]} ${counts.get(k)}${k === "bird-letter" || k === "bird-perched" ? "마리" : "개"}`);
  }, [ornaments]);

  if (trees.length === 0) {
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
          책 한 권을 다 읽을 때마다 나무가 한 그루씩 자라고, 배지를 딸 때마다 별과 등불이 숲에 걸려요.
        </p>
        <Link
          href="/library/add"
          className="d mt-4 block rounded-[14px] py-3 text-center text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          첫 나무 심으러 가기
        </Link>
      </div>
    );
  }

  const stars = ornaments.filter((o) => o.ornament === "star").length;
  const skyStars = Math.min(6, 2 + Math.floor(trees.length / 12));

  return (
    <div>
      <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
        {childName}의 숲에 나무 {trees.length}그루가 자랐어요
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        {tally.length > 0 ? `배지로 얻은 ${tally.join(" · ")}도 숲에 있어요. ` : "배지를 따면 별과 등불이 숲에 걸려요. "}
        나무나 장식을 눌러 보세요.
      </p>

      {/* 누른 나무/장식이 뭔지 -- 숲 위에 고정된 한 줄 카드 */}
      <div
        className="mt-4 flex min-h-[52px] items-center gap-3 rounded-[16px] border px-4 py-2.5"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        aria-live="polite"
      >
        {picked?.kind === "tree" ? (
          <>
            <Illustration name={TREES[hash(picked.tree.bookId) % TREES.length]} height={32} className="flex-none" />
            <div className="min-w-0">
              <p className="d truncate text-sm">{picked.tree.title || "제목 없는 책"}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {formatDate(picked.tree.readDate)}에 심은 나무
              </p>
            </div>
          </>
        ) : picked?.kind === "ornament" ? (
          <>
            <span className="flex h-9 w-9 flex-none items-center justify-center">
              <Ornament kind={picked.ornament} avatar={avatar} inline />
            </span>
            <div className="min-w-0">
              <p className="d truncate text-sm">{picked.badge.label}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {picked.badge.description} 배지로 얻은 {ORNAMENT_LABEL[picked.ornament]}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            나무를 누르면 어떤 책인지, 장식을 누르면 어떤 배지인지 알려줘요.
          </p>
        )}
      </div>

      <div
        className="relative mt-3 overflow-hidden rounded-[var(--r)] px-3 pt-10 pb-4"
        style={{ background: "#DCE6D0" }}
      >
        {/* 하늘의 작은 별은 분위기용 -- 배지로 얻은 별(장식)은 나무 사이에 따로 */}
        {Array.from({ length: skyStars }, (_, i) => (
          <Illustration
            key={i}
            name="star"
            height={i % 2 ? 9 : 11}
            className="absolute"
            style={{ left: `${(i * 37 + 7) % 92}%`, top: `${6 + ((i * 13) % 14)}px`, opacity: 0.8 }}
          />
        ))}

        <div className="flex flex-wrap items-end gap-x-1 gap-y-4">
          {items.map((item, i) => {
            const active = picked?.key === item.key;
            if (item.kind === "tree") {
              const h = hash(item.tree.bookId);
              const name = TREES[h % TREES.length];
              const height = 40 + (h % 5) * 3 + (name === "tree-pine" ? 8 : 0);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPicked(active ? null : item)}
                  aria-label={`${item.tree.title || "책"} -- ${i + 1}번째`}
                  className="flex-none rounded-md transition-transform"
                  style={{
                    transform: active ? "scale(1.18)" : undefined,
                    filter: active ? "drop-shadow(0 2px 3px rgba(38,54,43,0.35))" : undefined,
                  }}
                >
                  <Illustration name={name} height={height} />
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
          {/* 숲길 끝에 아이와 곰 -- 오늘 탭의 이번 달 숲과 같은 구도 */}
          <span className="ml-auto flex flex-none items-end gap-1 pl-2">
            <AvatarIllustration avatar={avatar} height={56} />
            <Illustration name="bear-lantern" height={72} />
          </span>
        </div>
      </div>
      {stars > 0 && (
        <p className="hand mt-3 text-base" style={{ color: "var(--point-deep)" }}>
          배지를 딸수록 숲이 더 반짝여요
        </p>
      )}
    </div>
  );
}
