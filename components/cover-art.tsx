import { coverColor } from "@/lib/shelf-visual";

// 표지 그림이 없는 책의 대신 표지 -- 팔레트 색 바탕 + 왼쪽 책등 그늘 + 흰 제목.
// 크기(className)는 부르는 쪽이 정하고, size로 글자 크기만 고른다.
//   xs: 목록 줄의 작은 표지(32px 안팎) -- 제목 첫 글자만
//   sm: 중간 표지(40~60px) -- 제목 세 줄까지
//   md: 선반의 큰 표지 -- 제목 네 줄까지
// 훅이 없는 평범한 컴포넌트라 서버·클라이언트 어디서든 쓸 수 있다.
export default function CoverArt({
  title,
  size = "md",
  className = "",
  style,
}: {
  title: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}) {
  const text = title.trim();
  const lines = size === "md" ? 4 : 3;
  return (
    <span
      aria-hidden
      className={`relative flex flex-none items-center justify-center overflow-hidden text-center ${className}`}
      style={{ background: coverColor(text || "책"), ...style }}
    >
      {/* 책등 쪽 그늘 + 위아래 가는 띠 -- 색 판이 아니라 책처럼 보이게 */}
      <span className="absolute inset-y-0 left-0" style={{ width: "9%", background: "rgba(0,0,0,0.14)" }} />
      <span className="absolute inset-x-0" style={{ top: "9%", height: 1, background: "rgba(255,255,255,0.35)" }} />
      <span className="absolute inset-x-0" style={{ bottom: "9%", height: 1, background: "rgba(255,255,255,0.35)" }} />
      {size === "xs" ? (
        <span className="d relative text-[13px] text-white">{text.slice(0, 1)}</span>
      ) : (
        <span
          className={`d relative px-[11%] text-white ${size === "md" ? "text-[13px] leading-snug" : "text-[10px] leading-tight"}`}
          style={{
            wordBreak: "keep-all",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: lines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textShadow: "0 1px 2px rgba(0,0,0,0.18)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
