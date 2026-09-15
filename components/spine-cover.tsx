import { SPINE_BLUR_PX, SPINE_SCRIM } from "@/lib/shelf-visual";

// 책등 안에 까는 표지 띠 -- 부모 요소가 `relative overflow-hidden`이어야 한다.
// 바깥 span이 클리핑을, 안쪽 첫 span이 블러된 표지(가장자리가 흐려져 비치지
// 않도록 사방 6px 더 크게 그려 넘치는 부분은 잘라 냄), 둘째 span이 어두운 막.
// 제목 글자는 이 위에 올라와야 하므로 호출부에서 `relative`를 준다.
export function SpineCover({ coverUrl }: { coverUrl: string | null | undefined }) {
  if (!coverUrl) return null;
  const url = `url("${coverUrl.replace(/"/g, "%22")}")`;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="absolute"
        style={{
          inset: -6,
          backgroundImage: url,
          backgroundSize: "auto 100%",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          filter: `blur(${SPINE_BLUR_PX}px)`,
        }}
      />
      <span className="absolute inset-0" style={{ background: SPINE_SCRIM }} />
    </span>
  );
}
