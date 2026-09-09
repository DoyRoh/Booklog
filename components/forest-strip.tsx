import Link from "next/link";
import Illustration, { AvatarIllustration, type Avatar, type IllustrationName } from "@/components/illustration";

// 오늘 탭 요약 카드 맨 위의 "이번 달 숲" -- 이번 달에 다 읽은 책 한 권이
// 나무 한 그루가 되어 자라고, 그 숲길 끝에 아이(아바타)와 등불 든 곰이
// 서 있다. 숫자보다 그림이 먼저 눈에 들어오게 하려는 아이용 장치라,
// 나무 종류·크기는 순서대로 돌려 쓰고(같은 달엔 항상 같은 모양) 별은
// 고정 위치에 몇 개만 둔다.
const TREES: { name: IllustrationName; height: number }[] = [
  { name: "tree-light", height: 40 },
  { name: "tree-bushy", height: 44 },
  { name: "tree-round", height: 48 },
  { name: "tree-pine", height: 54 },
];
const MAX_TREES = 12;
const STARS = [
  { left: "6%", top: "14%", height: 11 },
  { left: "38%", top: "8%", height: 9 },
  { left: "62%", top: "20%", height: 12 },
];

export default function ForestStrip({
  treeCount,
  avatar,
  className,
  href,
}: {
  treeCount: number;
  avatar: Avatar | null | undefined;
  className?: string;
  /** 있으면 장면 전체가 이 주소(우리 숲 전체 보기)로 가는 링크가 된다. */
  href?: string;
}) {
  const shown = Math.min(treeCount, MAX_TREES);
  // 나무가 많아지면 한 줄에 다 들어가도록 조금씩 작게
  const scale = shown <= 5 ? 1 : shown <= 8 ? 0.8 : 0.66;
  const caption =
    treeCount === 0
      ? "이번 달 첫 책을 읽으면 나무가 자라나요"
      : `이번 달에 나무 ${treeCount}그루가 자랐어요`;

  const body = (
    <>
      <div
        className="relative overflow-hidden rounded-[16px] px-3 pt-5 pb-2"
        style={{ background: "#DCE6D0" }}
        aria-label={caption}
        role="img"
      >
        {STARS.map((star, i) => (
          <Illustration
            key={i}
            name="star"
            height={star.height}
            className="absolute"
            style={{ left: star.left, top: star.top }}
          />
        ))}
        <div className="flex items-end gap-1">
          <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-hidden">
            {Array.from({ length: shown }, (_, i) => {
              const tree = TREES[i % TREES.length];
              return (
                <Illustration
                  key={i}
                  name={tree.name}
                  height={Math.round(tree.height * scale)}
                  className="flex-none"
                />
              );
            })}
            {treeCount > MAX_TREES && (
              <span className="d ml-1 flex-none self-center text-xs" style={{ color: "var(--point-deep)" }}>
                +{treeCount - MAX_TREES}
              </span>
            )}
          </div>
          <AvatarIllustration avatar={avatar} height={56} className="flex-none" />
          <Illustration name="bear-lantern" height={72} className="flex-none" priority />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="hand text-base" style={{ color: "var(--point-deep)" }}>
          {caption}
        </p>
        {href && (
          <span className="flex-none text-xs" style={{ color: "var(--ink-2)" }}>
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
