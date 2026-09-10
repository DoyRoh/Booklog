import type { ReactNode } from "react";

/**
 * 화면의 한 묶음 = 카드 하나. 제목이 배경에 떠 있고 내용만 카드에 들어가면
 * "제목과 내용이 한 묶음으로 안 보인다"(사용자 피드백)라서, 제목·설명·오른쪽
 * 액션을 카드 머리에 넣고 얇은 선 아래에 내용을 둔다. 내용이 스스로 줄
 * 목록(구분선)을 그리면 flush로 안쪽 여백을 없앤다.
 */
export default function Section({
  title,
  description,
  action,
  flush = false,
  className = "",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[var(--r)] border ${className}`}
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      <header
        className="flex items-start justify-between gap-3 px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(38,54,43,0.08)" }}
      >
        <div className="min-w-0 flex-1">
          <p className="d text-base leading-tight">{title}</p>
          {description && (
            <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-none">{action}</div>}
      </header>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}
