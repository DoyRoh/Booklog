import Image from "next/image";
import type { CSSProperties } from "react";

// public/illustrations/ 에 있는 크레용 일러스트(사용자가 ChatGPT로 그려온
// 시트를 scripts/slice-sheet.py로 잘라 넣은 것)의 원본 픽셀 크기.
// 높이만 정하면 비율에 맞춰 너비를 계산한다.
export const ILLUSTRATIONS = {
  "bear-lantern": [443, 564],
  "bird-letter": [1015, 716],
  "bird-perched": [234, 422],
  rabbit: [173, 459],
  dog: [257, 401],
  cat: [249, 398],
  "lantern-on": [385, 394],
  "lantern-off": [182, 353],
  "paw-rabbit": [228, 299],
  "paw-dog": [306, 286],
  "paw-cat": [290, 249],
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;
export type Avatar = "rabbit" | "dog" | "cat";

type Props = {
  name: IllustrationName;
  height: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  /** 장식용이면 비워 두고(스크린리더가 건너뜀), 의미가 있으면 짧게 적는다. */
  alt?: string;
};

export default function Illustration({ name, height, className, style, priority, alt = "" }: Props) {
  const [w, h] = ILLUSTRATIONS[name];
  const width = Math.round((height * w) / h);
  return (
    <Image
      src={`/illustrations/${name}.png`}
      width={width}
      height={height}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      priority={priority}
      className={className}
      style={{ height, width, ...style }}
    />
  );
}

/** 아이가 고른 아바타(토끼/강아지/고양이). 아직 안 골랐으면 토끼. */
export function AvatarIllustration({
  avatar,
  height,
  className,
  style,
}: {
  avatar: Avatar | null | undefined;
  height: number;
  className?: string;
  style?: CSSProperties;
}) {
  return <Illustration name={avatar ?? "rabbit"} height={height} className={className} style={style} />;
}

/** 아바타별 발자국 도장 -- 책을 다 읽었을 때 "쾅" 찍히는 그것.
 *  도장 PNG는 잉크색 한 가지 + 알파 마스크라(scripts/stamp-mask.py),
 *  CSS mask로 그려서 배경에 맞는 색으로 찍을 수 있다. 세이지 배경에서는
 *  기본(짙은 초록), 진한 초록 배경 위에서는 color="var(--paper)"처럼
 *  반전해서 쓴다(사용자 피드백: 진한 배경 위에 구멍 뚫린 초록 도장은
 *  테두리만 있는 것처럼 보여 이상함). */
export function PawStamp({
  avatar,
  height,
  color = "var(--point-deep)",
  className,
  style,
}: {
  avatar: Avatar | null | undefined;
  height: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const name = `paw-${avatar ?? "rabbit"}` as const;
  const [w, h] = ILLUSTRATIONS[name];
  const width = Math.round((height * w) / h);
  const mask = `url(/illustrations/${name}.png) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        width,
        height,
        backgroundColor: color,
        WebkitMask: mask,
        mask,
        ...style,
      }}
    />
  );
}
