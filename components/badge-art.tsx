import type React from "react";
import Illustration, { PawStamp, type Avatar, type IllustrationName } from "@/components/illustration";

// 배지마다 다른 그림 -- 패턴 그림에서 잘라낸 숲 조각(나무·별·등불·새·곰)과
// 아이 아바타의 발자국 도장을 조합한다. 아직 못 딴 배지는 흑백·반투명.
type Piece = { name: IllustrationName; height: number };

const T = (name: IllustrationName, height: number): Piece => ({ name, height });

// 권수 마일스톤은 권수가 커질수록 숲이 빽빽해진다.
function milestoneArt(count: number): Piece[] {
  if (count < 5) return [T("tree-light", 30)];
  if (count < 10) return [T("tree-bushy", 32)];
  if (count < 50) return [T("tree-round", 26), T("tree-pine", 34)];
  if (count < 100) return [T("tree-light", 22), T("tree-pine", 32), T("tree-bushy", 24)];
  if (count < 200) return [T("tree-bushy", 22), T("tree-pine", 32), T("tree-round", 24), T("star", 8)];
  if (count < 500) return [T("star", 8), T("tree-round", 22), T("tree-pine", 32), T("tree-bushy", 22), T("star", 8)];
  if (count < 1000) return [T("tree-light", 18), T("tree-bushy", 22), T("tree-pine", 32), T("tree-round", 22), T("star", 9)];
  return [T("star", 9), T("tree-pine", 26), T("lantern-on", 26), T("tree-pine", 30), T("star", 9)];
}

const ART: Record<string, Piece[]> = {
  d2: [T("star", 20)],
  d3: [T("star", 16), T("star", 22)],
  week: [T("lantern-on", 36)],
  d14: [T("star", 10), T("lantern-on", 34), T("star", 10)],
  d30: [T("lantern-on", 26), T("lantern-on", 34), T("lantern-on", 26)],
  week10: [T("star", 10), T("tree-pine", 34), T("star", 10)],
  month20: [T("tree-bushy", 24), T("tree-round", 30), T("tree-bushy", 24)],
  months3: [T("tree-light", 22), T("tree-round", 28), T("tree-pine", 34)],
  fav1: [T("star", 12), T("tree-light", 30)],
  fav5: [T("star", 10), T("tree-light", 28), T("star", 10)],
  group1: [T("bear-lantern", 36)],
  group3: [T("bear-lantern", 36), T("star", 10)],
  rec10: [T("lantern-on", 24), T("tree-round", 30)],
  rec30: [T("lantern-on", 24), T("tree-round", 28), T("tree-pine", 32)],
  rec100: [T("lantern-on", 24), T("tree-round", 24), T("tree-pine", 32), T("tree-bushy", 24)],
  hw1: [T("lantern-on", 30)],
  hw5: [T("lantern-on", 28), T("star", 10)],
  hw20: [T("star", 9), T("lantern-on", 30), T("star", 9)],
  photo10: [T("bird-letter", 30)],
  photo30: [T("bird-letter", 30), T("star", 10)],
  voice5: [T("bird-perched", 36)],
  voice20: [T("bird-perched", 36), T("star", 10)],
  author10: [T("bird-perched", 28), T("bird-letter", 24)],
  author30: [T("bird-perched", 28), T("bird-letter", 24), T("star", 10)],
};

export default function BadgeArt({
  id,
  count,
  avatar,
  achieved,
}: {
  id: string;
  count?: number;
  avatar: Avatar | null | undefined;
  achieved: boolean;
}) {
  // 그림은 늘 연한 초록 동그라미(스티커) 위에 올린다 -- 하얀 새처럼 밝은
  // 그림도 흰 카드 위에서 보이고, 아이 눈엔 "모으는 스티커"로 읽힌다.
  const disc = (children: React.ReactNode) => (
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
  if (id === "again" || id === "again3" || id === "same5") {
    return disc(
      <>
        {id !== "again" && <PawStamp avatar={avatar} height={18} />}
        <PawStamp avatar={avatar} height={id === "again" ? 28 : 26} />
        {id !== "again" && <PawStamp avatar={avatar} height={18} />}
        {id === "same5" && <PawStamp avatar={avatar} height={14} />}
      </>
    );
  }
  const pieces = count !== undefined ? milestoneArt(count) : (ART[id] ?? [T("star", 20)]);
  return disc(pieces.map((piece, i) => <Illustration key={i} name={piece.name} height={piece.height} className="flex-none" />));
}
