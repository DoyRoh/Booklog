import type React from "react";
import Illustration, { PawStamp, type Avatar, type IllustrationName } from "@/components/illustration";

// 배지마다 다른 그림 -- 패턴 그림에서 잘라낸 숲 조각(나무·별·등불·새)과
// 아이 아바타의 발자국 도장을 조합한다. 권수 마일스톤은 나무가 한 그루씩
// 늘어나는 작은 숲, 연속 기록은 별→등불, 다시 읽기는 발자국, 사진·녹음은
// 소식을 물어오는 새. 아직 못 딴 배지는 흑백·반투명으로.
type Piece = { name: IllustrationName; height: number };

const ART: Record<string, Piece[]> = {
  m1: [{ name: "tree-light", height: 30 }],
  m3: [{ name: "tree-bushy", height: 32 }],
  m5: [{ name: "tree-round", height: 34 }],
  m10: [{ name: "tree-pine", height: 38 }],
  m20: [
    { name: "tree-bushy", height: 28 },
    { name: "tree-pine", height: 36 },
  ],
  m30: [
    { name: "tree-round", height: 26 },
    { name: "tree-pine", height: 34 },
    { name: "tree-light", height: 24 },
  ],
  m50: [
    { name: "tree-light", height: 18 },
    { name: "tree-bushy", height: 22 },
    { name: "tree-pine", height: 30 },
    { name: "tree-round", height: 22 },
  ],
  m100: [
    { name: "star", height: 8 },
    { name: "tree-bushy", height: 22 },
    { name: "tree-pine", height: 32 },
    { name: "tree-round", height: 24 },
    { name: "star", height: 8 },
  ],
  week10: [
    { name: "star", height: 10 },
    { name: "lantern-on", height: 32 },
    { name: "star", height: 10 },
  ],
  d2: [{ name: "star", height: 20 }],
  d3: [
    { name: "star", height: 16 },
    { name: "star", height: 22 },
  ],
  week: [{ name: "lantern-on", height: 36 }],
  photo10: [{ name: "bird-letter", height: 30 }],
  voice5: [{ name: "bird-perched", height: 36 }],
};

export default function BadgeArt({
  id,
  avatar,
  achieved,
}: {
  id: string;
  avatar: Avatar | null | undefined;
  achieved: boolean;
}) {
  // 그림은 늘 연한 초록 동그라미(스티커) 위에 올린다 -- 하얀 새처럼 밝은
  // 그림도 흰 카드 위에서 보이고, 아이 눈엔 "모으는 스티커"로 읽힌다.
  const disc = (
    children: React.ReactNode
  ) => (
    <div
      className="flex h-16 w-16 items-end justify-center gap-0.5 rounded-full pb-2.5"
      style={{
        background: achieved ? "#DCE6D0" : "rgba(38,54,43,0.06)",
        filter: achieved ? undefined : "grayscale(1)",
        opacity: achieved ? 1 : 0.55,
      }}
    >
      {children}
    </div>
  );
  if (id === "again" || id === "again3") {
    return disc(
      <>
        <PawStamp avatar={avatar} height={id === "again3" ? 18 : 28} />
        {id === "again3" && <PawStamp avatar={avatar} height={26} />}
        {id === "again3" && <PawStamp avatar={avatar} height={18} />}
      </>
    );
  }
  const pieces = ART[id] ?? [{ name: "star" as const, height: 20 }];
  return disc(
    pieces.map((piece, i) => (
      <Illustration key={i} name={piece.name} height={piece.height} className="flex-none" />
    ))
  );
}
