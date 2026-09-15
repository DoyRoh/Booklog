import type { Badge } from "@/lib/badges";
import { ORNAMENT_BY_BADGE, type OrnamentKind } from "@/lib/forest-scene";
import type { IllustrationName } from "@/components/illustration";

// 우리 숲(forest-view.tsx)의 나무·장식 배치 규칙. 오늘 탭 미리보기
// (forest-strip.tsx)도 이 함수들을 그대로 써서 두 화면이 똑같은 그림을
// 그린다("배지 모은 그 그림을 메인으로 하고 똑같이" -- 사용자 요청).
export type ForestItem =
  | { kind: "tree"; key: string; badge: Badge }
  | { kind: "ornament"; key: string; badge: Badge; ornament: OrnamentKind };

// 권수 배지의 나무 -- 권수가 커질수록 다른 종류·더 큰 나무.
export function milestoneTreeArt(count: number): { name: IllustrationName; height: number } {
  if (count < 10) return { name: "tree-light", height: 36 };
  if (count < 50) return { name: "tree-bushy", height: 42 };
  if (count < 100) return { name: "tree-round", height: 48 };
  if (count < 200) return { name: "tree-pine", height: 54 };
  if (count < 500) return { name: "tree-round", height: 56 };
  return { name: "tree-pine", height: 64 };
}

/** 나무 사이사이에 장식을 고르게 끼워 넣는다. */
export function buildForestItems(badges: Badge[]): ForestItem[] {
  const trees = badges.filter((b) => b.achieved && b.count !== undefined);
  const ornaments = badges
    .filter((b) => b.achieved && b.count === undefined && ORNAMENT_BY_BADGE[b.id])
    .map((b) => ({ badge: b, ornament: ORNAMENT_BY_BADGE[b.id] }));

  const out: ForestItem[] = [];
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
}
