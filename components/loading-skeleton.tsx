// 화면 전환 중에 보이는 자리. 예전엔 숲길 행렬 그림 + 손글씨 문구를 크게
// 띄웠는데 탭을 옮길 때마다 떠서 정신 사납다는 피드백으로 거의 빈 화면으로
// 되돌렸다 -- 0.4초 안에 끝나는 전환에선 아무것도 안 보이고, 그보다 오래
// 걸릴 때만 화면 가운데에 작은 점 세 개가 조용히 깜빡인다. 행렬 그림
// (public/illustrations/parade-strip.jpg)은 다른 자리에 쓰려고 남겨 둔다.
export default function LoadingSkeleton() {
  return (
    <div
      className="flex justify-center pt-[38vh]"
      style={{ opacity: 0, animation: "skeleton-delayed-fade-in 0.2s ease-out 0.4s forwards" }}
      aria-busy="true"
      aria-label="불러오는 중"
    >
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="loading-dot h-2 w-2 rounded-full"
            style={{ background: "var(--point)", animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
    </div>
  );
}
