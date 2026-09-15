import type { Badge } from "@/lib/badges";

// 우리 숲의 "배지 → 장식" 규칙. 평면 숲(forest-view)과 3D 숲(forest-3d)이
// 같은 표를 쓴다. 권수 배지는 나무, 나머지는 아래 표대로.
export type OrnamentKind =
  | "star"
  | "lantern"
  | "bird-letter"
  | "bird-perched"
  | "paw"
  | "bear"
  | "butterfly"
  | "ladybug"
  | "snail";

export const ORNAMENT_BY_BADGE: Record<string, OrnamentKind> = {
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
  // 실제 숲지기(곰·백로)는 숲길 끝에 그룹 수만큼 따로 서 있으므로, 그룹
  // 가입 배지 장식까지 곰으로 또 심으면 같은 정보의 중복이라 별로 바꿨다
  // (badge-art.tsx의 group1/group3와 항상 짝을 맞춰야 하는 매핑).
  group1: "star",
  group3: "star",
  rec10: "lantern",
  rec30: "lantern",
  rec100: "lantern",
  hw1: "lantern",
  hw5: "lantern",
  hw20: "lantern",
  // 사진·목소리·이야기꾼은 곰·새 대신 나비·무당벌레·달팽이로(badge-art.tsx의
  // CRITTER_ART와 같은 배정 -- 우리 숲 장식과 배지 목록 그림이 항상 같아야
  // 한다, "첫 숲지기" 곰/새 불일치 사고를 다시 겪지 않기 위해).
  photo10: "butterfly",
  photo30: "butterfly",
  voice5: "ladybug",
  voice20: "ladybug",
  author10: "snail",
  author30: "snail",
};

export const ORNAMENT_LABEL: Record<OrnamentKind, string> = {
  star: "별",
  lantern: "등불",
  "bird-letter": "편지 새",
  "bird-perched": "새",
  paw: "발자국",
  bear: "곰",
  butterfly: "나비",
  ladybug: "무당벌레",
  snail: "달팽이",
};

/** 3D 숲에서는 발자국 배지가 버섯으로 자란다(땅에 남는 자국 → 숲속 열매·버섯). */
export const ORNAMENT_LABEL_3D: Record<OrnamentKind, string> = { ...ORNAMENT_LABEL, paw: "버섯" };

/** 요약 문구("나비 3마리")에 쓰는 단위 -- 살아있는 것은 마리, 사물은 개. */
export const ORNAMENT_COUNTER: Record<OrnamentKind, string> = {
  star: "개",
  lantern: "개",
  "bird-letter": "마리",
  "bird-perched": "마리",
  paw: "개",
  bear: "마리",
  butterfly: "마리",
  ladybug: "마리",
  snail: "마리",
};

export type TreeKind = "light" | "bushy" | "round" | "pine";

/** 권수 배지의 나무 -- 권수가 커질수록 다른 종류·더 큰 나무. */
export function milestoneTreeKind(count: number): { kind: TreeKind; scale: number } {
  if (count < 10) return { kind: "light", scale: 0.8 };
  if (count < 50) return { kind: "bushy", scale: 0.95 };
  if (count < 100) return { kind: "round", scale: 1.1 };
  if (count < 200) return { kind: "pine", scale: 1.2 };
  if (count < 500) return { kind: "round", scale: 1.35 };
  return { kind: "pine", scale: 1.5 };
}

export type SceneItem =
  | { kind: "tree"; key: string; badge: Badge; tree: TreeKind; scale: number; x: number; z: number; rot: number }
  | { kind: "ornament"; key: string; badge: Badge; ornament: OrnamentKind; x: number; z: number; rot: number };

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

// 해바라기 씨앗 배열(황금각 나선): i번째 자리가 가운데에서 바깥으로 고르게
// 퍼진다. 첫 나무가 가운데 가까이, 배지를 딸수록 숲이 바깥으로 넓어진다.
export function spiralSlot(index: number): { x: number; z: number; r: number } {
  const r = 1.9 + 1.35 * Math.sqrt(index + 1);
  const a = index * 2.399963 + 0.9;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, r };
}

/** 나무 사이사이에 장식을 고르게 끼워 넣고 나선 자리에 놓는다. */
export function layoutForest(badges: Badge[]): SceneItem[] {
  const trees = badges.filter((b) => b.achieved && b.count !== undefined);
  const ornaments = badges
    .filter((b) => b.achieved && b.count === undefined && ORNAMENT_BY_BADGE[b.id])
    .map((b) => ({ badge: b, ornament: ORNAMENT_BY_BADGE[b.id] }));

  const order: ({ kind: "tree"; badge: Badge } | { kind: "ornament"; badge: Badge; ornament: OrnamentKind })[] = [];
  const every = ornaments.length ? Math.max(1, Math.floor(trees.length / (ornaments.length + 1))) : Infinity;
  let oi = 0;
  trees.forEach((badge, i) => {
    order.push({ kind: "tree", badge });
    if ((i + 1) % every === 0 && oi < ornaments.length) order.push({ kind: "ornament", ...ornaments[oi++] });
  });
  while (oi < ornaments.length) order.push({ kind: "ornament", ...ornaments[oi++] });

  return order.map((entry, i) => {
    const slot = spiralSlot(i);
    const j = hash(entry.badge.id);
    const x = slot.x + (j - 0.5) * 0.6;
    const z = slot.z + (hash(entry.badge.id + "z") - 0.5) * 0.6;
    const rot = j * Math.PI * 2;
    if (entry.kind === "tree") {
      const { kind, scale } = milestoneTreeKind(entry.badge.count ?? 1);
      return { kind: "tree", key: entry.badge.id, badge: entry.badge, tree: kind, scale, x, z, rot };
    }
    return { kind: "ornament", key: entry.badge.id, badge: entry.badge, ornament: entry.ornament, x, z, rot };
  });
}
