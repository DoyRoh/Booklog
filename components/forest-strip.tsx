import Link from "next/link";
import Illustration, { AvatarIllustration, type Avatar } from "@/components/illustration";
import ForestOrnament from "@/components/forest-ornament";
import type { Badge } from "@/lib/badges";
import { buildForestItems, milestoneTreeArt } from "@/lib/forest-items";
import { KEEPER_MAX, keeperIllustration } from "@/lib/keeper-scene";
import type { OperatorAvatar } from "@/lib/active-profile";

// 오늘 탭 요약 카드 맨 위의 우리 숲 미리보기. 우리 숲(forest-view.tsx)과
// 완전히 같은 배지 데이터로 완전히 같은 배치 규칙(buildForestItems)·나무
// 그림(milestoneTreeArt)·장식(ForestOrnament)·숲지기 얼굴(keeperIllustration)을
// 써서, 두 화면이 실제로 같은 그림을 보여준다(사용자 요청: "그림 통일").
// 카드 폭이 좁아 전부는 못 보여주므로 앞에서부터 일부만 자르고 "+N"으로.
const MAX_ITEMS = 10;

export default function ForestStrip({
  badges,
  avatar,
  groups = [],
  className,
  href,
}: {
  badges: Badge[];
  avatar: Avatar | null | undefined;
  /** 속한 그룹(숲지기)들 -- 우리 숲과 같이 그룹마다 한 명, 그 그룹이 고른 얼굴로. */
  groups?: { id: string; name: string; avatar: OperatorAvatar | null }[];
  className?: string;
  /** 있으면 장면 전체가 이 주소(우리 숲 전체 보기)로 가는 링크가 된다. */
  href?: string;
}) {
  const items = buildForestItems(badges);
  const treeCount = items.filter((i) => i.kind === "tree").length;
  const shownItems = items.slice(0, MAX_ITEMS);
  const hiddenCount = items.length - shownItems.length;
  // 오른쪽 "우리 숲 보기 ›"와 한 줄에 들어가야 하니 짧게(두 줄로 꺾이면 산만).
  const caption = treeCount === 0 ? "첫 책을 읽으면 나무가 심겨요" : `나무 ${treeCount}그루가 자랐어요`;
  // 길잡이(그룹 없을 때)는 최소 1명은 항상 서 있는다.
  const keepers = groups.length
    ? groups.slice(0, KEEPER_MAX)
    : [{ id: "guide", name: "길잡이", avatar: null as OperatorAvatar | null }];
  const skyStars = Math.min(6, 2 + Math.floor(treeCount / 5));

  const body = (
    <>
      <div
        className="relative overflow-hidden rounded-[16px] px-3 pt-5 pb-2"
        style={{ background: "var(--sprout-pale)" }}
        aria-label={caption}
        role="img"
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
        <div className="flex items-end gap-1">
          <div className="flex min-w-0 flex-1 items-end gap-1 overflow-hidden">
            {shownItems.map((item) => {
              if (item.kind === "tree") {
                const tree = milestoneTreeArt(item.badge.count ?? 1);
                return <Illustration key={item.key} name={tree.name} height={tree.height} className="flex-none" />;
              }
              return (
                <span key={item.key} className="flex flex-none items-end">
                  <ForestOrnament kind={item.ornament} avatar={avatar} inline />
                </span>
              );
            })}
            {hiddenCount > 0 && (
              <span className="d ml-1 flex-none self-end pb-1 text-xs" style={{ color: "var(--point-deep)" }}>
                +{hiddenCount}
              </span>
            )}
          </div>
          <AvatarIllustration avatar={avatar} height={56} className="flex-none" />
          {/* 숲지기 = 그룹마다 한 명, 그 그룹이 고른 얼굴로 -- 우리 숲과 같은 규칙. */}
          <span className="flex flex-none items-end">
            {keepers.map((g, i) => (
              <span key={g.id} style={{ marginLeft: i > 0 ? -10 : 0 }}>
                <Illustration
                  name={keeperIllustration(g.avatar)}
                  height={i === 0 ? 72 : 60}
                  className="flex-none"
                  priority={i === 0}
                />
              </span>
            ))}
          </span>
        </div>
      </div>
      <div className="mt-[12px] flex items-center justify-between gap-2">
        <p className="hand min-w-0 truncate text-[18px] leading-[24px]" style={{ color: "var(--point-deep)" }}>
          {caption}
        </p>
        {href && (
          <span className="d flex-none text-[13px] leading-[18px]" style={{ color: "var(--ink-2)" }}>
            우리 숲 보기 ›
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${className ?? ""}`}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
