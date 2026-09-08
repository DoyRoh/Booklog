import Image from "next/image";

// 사용자가 그려온 장면 그림(밤 숲길, 낮 숲길 행렬, 패턴)을 둥근 배너로
// 보여준다. 그림마다 초점이 다르므로 objectPosition을 받는다.
export const SCENES = {
  forest: { src: "/illustrations/forest-path.jpg", position: "center 62%", bg: "var(--point-deep)" },
  parade: { src: "/illustrations/parade.jpg", position: "center 72%", bg: "#DCE6D3" },
  pattern: { src: "/illustrations/pattern.jpg", position: "center 12%", bg: "var(--paper)" },
} as const;

export default function SceneBanner({
  scene,
  height = 160,
  className,
}: {
  scene: keyof typeof SCENES;
  height?: number;
  className?: string;
}) {
  const s = SCENES[scene];
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[var(--r)] ${className ?? ""}`}
      style={{ height, background: s.bg }}
    >
      <Image
        src={s.src}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 640px) 100vw, 640px"
        priority
        style={{ objectFit: "cover", objectPosition: s.position }}
      />
    </div>
  );
}
