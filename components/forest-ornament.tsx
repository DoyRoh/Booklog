import Illustration, { PawStamp, type Avatar } from "@/components/illustration";
import { ButterflyIcon, LadybugIcon, SnailIcon } from "@/components/icons/badge-critters";
import type { OrnamentKind } from "@/lib/forest-scene";

// 우리 숲(forest-view.tsx)과 오늘 탭 미리보기(forest-strip.tsx)가 공유하는
// 장식 그림 -- 같은 배지가 항상 같은 그림으로 보이게 한다.
export default function ForestOrnament({
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
    case "bear":
      return <Illustration name="bear-lantern" height={Math.round(36 * s)} />;
    case "butterfly":
      return <ButterflyIcon height={Math.round(24 * s)} style={{ marginBottom: inline ? 0 : 20 }} />;
    case "ladybug":
      return <LadybugIcon height={Math.round(22 * s)} />;
    case "snail":
      return <SnailIcon height={Math.round(22 * s)} />;
  }
}
