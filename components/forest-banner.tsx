import Image from "next/image";

// 밤 숲길 배경(사용자가 그려온 크레용 일러스트). 로그인·온보딩처럼 아직
// 아이 이름도 없는 첫 화면에서 "책숲" 세계관을 한 장면으로 보여준다.
// 어두운 그림이라 본문 위에 깔지 않고 상단 배너로만 쓴다.
export default function ForestBanner({ height = 160 }: { height?: number }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--r)]"
      style={{ height, background: "var(--point-deep)" }}
    >
      <Image
        src="/illustrations/forest-path.jpg"
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 520px) 100vw, 520px"
        priority
        style={{ objectFit: "cover", objectPosition: "center 62%" }}
      />
    </div>
  );
}
