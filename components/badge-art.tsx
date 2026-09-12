import type React from "react";
import Illustration, { PawStamp, type Avatar, type IllustrationName } from "@/components/illustration";
import { ButterflyIcon, LadybugIcon, SnailIcon } from "@/components/icons/badge-critters";

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
  // 매일 밤 읽고 따뜻한 차 한 잔 -- 사용자가 그려온 그림으로 나무 재활용을 줄였다.
  week: [T("tea-mug", 34)],
  d14: [T("star", 10), T("lantern-on", 34), T("star", 10)],
  d30: [T("lantern-on", 26), T("lantern-on", 34), T("lantern-on", 26)],
  // 한 주에 10권 = 비 온 뒤 하룻밤 사이 버섯이 무더기로 자라는 것처럼.
  week10: [T("mushroom-cluster", 30)],
  // 한 달에 20권 = 가을 도토리처럼 풍성한 수확.
  month20: [T("acorn", 34)],
  // 3달 연속 = 계절을 건너는 여우.
  months3: [T("fox", 34)],
  fav1: [T("forget-me-not", 32)],
  fav5: [T("pasque-flower", 32)],
  // 곰·백로는 이제 실제 숲길 끝에 서는 "진짜 숲지기"(그룹마다 한 명, 고른
  // 얼굴 그대로) 전용 -- 그룹 가입 배지에까지 곰을 또 그리면 같은 정보를
  // 두 번 보여주는 셈이라(사용자 지적: "곰은 그룹 가입하면 어차피 생기는
  // 거 아냐?"), 배지 자체는 별로 바꿨다.
  group1: [T("star", 32)],
  group3: [T("star", 18), T("star", 26), T("star", 18)],
  // 등불 따라 걷는 여정 -- 걸음이 늘수록 더 먼 곳까지 갈 수 있는 탈것으로.
  rec10: [T("tent", 34)],
  rec30: [T("camper", 30)],
  rec100: [T("land-rover", 28)],
  hw1: [T("lantern-on", 30)],
  hw5: [T("lantern-on", 28), T("star", 10)],
  hw20: [T("star", 9), T("lantern-on", 30), T("star", 9)],
};

// 사진·목소리·이야기꾼 배지는 곰·새 대신 이 셋(나비·무당벌레·달팽이)을
// 쓴다 -- 곰·새는 이제 "그룹 숲지기 수"를 보여주는 자리에만 남긴다
// (사용자 요청). ART 표와 같은 자리에서 "몇 번째 개수" 조합만 다르게.
const CRITTER_ART: Record<string, { Icon: typeof ButterflyIcon; heights: number[] }> = {
  photo10: { Icon: ButterflyIcon, heights: [30] },
  photo30: { Icon: ButterflyIcon, heights: [24, 24] },
  voice5: { Icon: LadybugIcon, heights: [28] },
  voice20: { Icon: LadybugIcon, heights: [22, 22] },
  author10: { Icon: SnailIcon, heights: [28] },
  author30: { Icon: SnailIcon, heights: [22, 22] },
};

export default function BadgeArt({
  id,
  count,
  avatar,
  achieved,
  size = 64,
}: {
  id: string;
  count?: number;
  avatar: Avatar | null | undefined;
  achieved: boolean;
  /** 동그라미 지름(px). 기본 64, 배지 목록은 52로 작게. 안의 그림도 비례해서 줄어든다. */
  size?: number;
}) {
  const k = size / 64;
  const px = (n: number) => Math.round(n * k);
  // 그림은 늘 연한 초록 동그라미(스티커) 위에 올린다 -- 하얀 새처럼 밝은
  // 그림도 흰 카드 위에서 보이고, 아이 눈엔 "모으는 스티커"로 읽힌다.
  const disc = (children: React.ReactNode) => (
    <div
      className="flex items-end justify-center gap-0.5 rounded-full"
      style={{
        width: size,
        height: size,
        paddingBottom: px(10),
        background: achieved ? "var(--sprout-pale)" : "rgba(38,54,43,0.06)",
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
        {id !== "again" && <PawStamp avatar={avatar} height={px(18)} />}
        <PawStamp avatar={avatar} height={px(id === "again" ? 28 : 26)} />
        {id !== "again" && <PawStamp avatar={avatar} height={px(18)} />}
        {id === "same5" && <PawStamp avatar={avatar} height={px(14)} />}
      </>
    );
  }
  const critter = CRITTER_ART[id];
  if (critter) {
    return disc(critter.heights.map((h, i) => <critter.Icon key={i} height={px(h)} />));
  }
  const pieces = count !== undefined ? milestoneArt(count) : (ART[id] ?? [T("star", 20)]);
  return disc(pieces.map((piece, i) => <Illustration key={i} name={piece.name} height={px(piece.height)} className="flex-none" />));
}
