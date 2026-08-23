// 화면 전환 시 하얗게 멈춘 것처럼 보이지 않도록, 데이터를 불러오는 동안
// Next.js가 자동으로 이 스켈레톤을 먼저 보여준다(각 라우트의 loading.tsx가
// 이 컴포넌트를 그대로 씀). 실제 지연 시간을 없애주진 않지만, "먹통"이
// 아니라 "불러오는 중"이라는 걸 바로 알 수 있게 해준다.
export default function LoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-[520px] px-5 pt-8 pb-10"
      style={{
        opacity: 0,
        animation: "skeleton-delayed-fade-in 0.15s ease-out 0.15s forwards",
      }}
    >
      <div className="animate-pulse">
        <div className="h-4 w-32 rounded-full" style={{ background: "var(--rule)" }} />
        <div
          className="mt-4 h-20 rounded-[var(--r)]"
          style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
        />
        <div className="mt-6 h-4 w-24 rounded-full" style={{ background: "var(--rule)" }} />
        <div className="mt-3 flex flex-col gap-3">
          <div
            className="h-16 rounded-[var(--r)]"
            style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
          />
          <div
            className="h-16 rounded-[var(--r)]"
            style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
          />
          <div
            className="h-16 rounded-[var(--r)]"
            style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
          />
        </div>
      </div>
    </div>
  );
}
