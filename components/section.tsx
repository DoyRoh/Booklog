import type { ReactNode } from "react";

/**
 * 화면의 한 묶음 = 카드 하나. 제목이 배경에 떠 있고 내용만 카드에 들어가면
 * "제목과 내용이 한 묶음으로 안 보인다"(사용자 피드백)라서, 제목·설명·오른쪽
 * 액션을 카드 머리에 넣고 얇은 선 아래에 내용을 둔다. 내용이 스스로 줄
 * 목록(구분선)을 그리면 flush로 안쪽 여백을 없앤다.
 */
export default function Section({
  id,
  title,
  description,
  action,
  flush = false,
  className = "",
  children,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden rounded-[var(--r)] border ${className}`}
      // 앵커로 스크롤해 오는 경우(대시보드 스탯 칸 클릭 등) 브라우저 기본
      // 동작은 이 섹션의 맨 위를 뷰포트 맨 위(y=0)에 맞추는데, 거기엔
      // 상단바(TopBar, 52px 고정)가 항상 떠 있어 제목 줄이 그 밑에 가려
      // 보인다("이상한 위치로 이동해"). id가 있는 섹션에만 상단바 높이만큼
      // 여유(scroll-margin-top)를 줘서 제목이 상단바 바로 아래에 보이게 한다.
      style={{ borderColor: "var(--rule)", background: "var(--card)", ...(id ? { scrollMarginTop: "68px" } : {}) }}
    >
      <header
        className="flex items-start justify-between gap-3 px-[24px] pt-[18px] pb-[14px]"
        style={{ borderBottom: "1px solid rgba(38,54,43,0.08)" }}
      >
        <div className="min-w-0 flex-1">
          <p className="d text-[18px] font-semibold leading-[24px]">{title}</p>
          {description && (
            <p className="mt-[4px] text-[13px] leading-[19px]" style={{ color: "var(--ink-2)" }}>
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-none pt-[2px]">{action}</div>}
      </header>
      <div className={flush ? "" : "px-[24px] py-[18px]"}>{children}</div>
    </section>
  );
}
