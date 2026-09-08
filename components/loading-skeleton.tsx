// 화면 전환 시 하얗게 멈춘 것처럼 보이지 않도록, 데이터를 불러오는 동안
// Next.js가 자동으로 이 화면을 먼저 보여준다(각 라우트의 loading.tsx가
// 이 컴포넌트를 그대로 씀). 회색 펄스 대신 곰이 앞장선 숲길 행렬이 천천히
// 지나가는 띠를 쓴다 -- 사용자가 그려온 그림. 150ms 안에 끝나는 빠른
// 전환에서는 아예 안 보이고(지연 페이드인), 오래 걸릴 때만 나타난다.
export default function LoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-[520px] px-5 pt-8 pb-10"
      style={{
        opacity: 0,
        animation: "skeleton-delayed-fade-in 0.15s ease-out 0.15s forwards",
      }}
      aria-busy="true"
      aria-label="불러오는 중"
    >
      <div
        className="relative h-[120px] w-full overflow-hidden rounded-[var(--r)]"
        style={{ background: "#DCE6D3" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/parade-strip.jpg"
          alt=""
          className="parade-walk absolute left-0 top-0 h-full w-auto max-w-none"
        />
      </div>
      <p className="hand mt-4 text-center text-lg" style={{ color: "var(--point-deep)" }}>
        숲길을 걷는 중이에요…
      </p>
    </div>
  );
}
