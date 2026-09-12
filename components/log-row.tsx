import type { ReactNode } from "react";
import Link from "next/link";

// "날짜 · 카테고리 칩 · 내용" 한 줄 목록 -- 사용자가 보여준 육아 기록 앱의
// 목록 형식을 추천도서·숙제 목록(숲지기 화면과 아이 화면 모두)에 그대로
// 쓴다. 왼쪽 날짜(위 굵게, 아래 회색), 가운데 색 칩(+아래 작은 보조 라벨),
// 오른쪽 제목(+회색 부제). 줄 사이는 옅은 구분선.

export type LogChip = { label: string; color: string; sub?: string };

export function LogRow({
  index,
  dateTop,
  dateBottom,
  chip,
  title,
  subtitle,
  right,
  href,
  onClick,
  first,
  hideDate,
  rightInteractive,
  children,
}: {
  /** 맨 왼쪽 순번(1부터) -- 숲지기 목록처럼 "몇 개인지"가 중요한 곳에만. */
  index?: number;
  dateTop: string;
  dateBottom?: string;
  chip: LogChip;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  href?: string;
  onClick?: () => void;
  first?: boolean;
  /** 바로 위 줄과 같은 날짜면 날짜 칸을 비워 같은 날끼리 묶어 보이게 한다. */
  hideDate?: boolean;
  /** right에 버튼(토글)이 들어가면 true -- 링크/버튼 바깥에 배치한다. */
  rightInteractive?: boolean;
  /** 제목 아래에 들어가는 확장 내용(숙제의 책 목록·미션 등). */
  children?: ReactNode;
}) {
  const dateCol = (
    <div
      className="flex w-11 flex-none flex-col pt-3.5"
      aria-hidden={hideDate && index === undefined ? true : undefined}
    >
      {/* 순번은 날짜 칸 위에 작게 -- 칸을 따로 만들면 그만큼 제목 칸이
          좁아져 책 제목이 두 줄로 꺾인다. */}
      {index !== undefined && (
        <span className="text-[10px] leading-none tabular-nums" style={{ color: "var(--ink-2)", opacity: 0.6 }}>
          {index}
        </span>
      )}
      {!hideDate && (
        <>
          <span className="d text-sm leading-tight" style={{ color: "var(--ink-2)" }}>
            {dateTop}
          </span>
          {dateBottom && (
            <span className="text-[9px] leading-tight" style={{ color: "var(--ink-2)", opacity: 0.6 }}>
              {dateBottom}
            </span>
          )}
        </>
      )}
    </div>
  );
  // 구분선은 날짜 칸을 비우고 칩부터 시작한다 -- 끝까지 이어진 선이 표처럼
  // 보여 촌스럽다는 피드백.
  const chipCol = (
    <div className="flex w-11 flex-none flex-col items-center gap-0.5">
      <span
        className="d inline-block rounded-full px-2 py-0.5 text-[11px] leading-tight text-white"
        style={{ background: chip.color }}
      >
        {chip.label}
      </span>
      {chip.sub && (
        <span className="text-[10px] leading-tight" style={{ color: chip.color }}>
          {chip.sub}
        </span>
      )}
    </div>
  );
  const text = (
    <div className="min-w-0 flex-1">
      {/* 제목은 두 줄까지만, 넘치면 … (긴 참고서 제목이 네 줄씩 차지하던 문제) */}
      <p
        className="text-sm leading-snug"
        style={{
          overflowWrap: "anywhere",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
  // 오른쪽에 토글 버튼이 있으면(rightInteractive) 링크 밖에 두고, 글자만
  // 있으면 링크 안에 넣어 줄 전체가 눌리게 한다(a 안에 button 중첩 금지).
  const rightNode = right ? <span className="flex flex-none items-start">{right}</span> : null;
  const main = (
    <>
      {chipCol}
      {text}
      {!rightInteractive && rightNode}
    </>
  );
  const mainCls = "flex min-w-0 flex-1 items-start gap-2 text-left";
  const mainEl = href ? (
    <Link href={href} className={mainCls}>
      {main}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className={mainCls}>
      {main}
    </button>
  ) : (
    <div className={mainCls}>{main}</div>
  );

  return (
    <div className="flex w-full items-stretch gap-2 px-4">
      {dateCol}
      <div
        className="flex min-w-0 flex-1 items-start gap-1 py-3.5"
        style={first ? undefined : { borderTop: "1px solid rgba(38,54,43,0.08)" }}
      >
        {mainEl}
        {rightInteractive && rightNode}
      </div>
    </div>
  );
}

/** 목록 묶음 하나: 흰 박스 안에 큰 머리글(예: "2026년 9월" / 그룹 이름) + 줄들. */
export function LogGroup({
  heading,
  headingSub,
  headingRight,
  children,
}: {
  heading: ReactNode;
  headingSub?: ReactNode;
  headingRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--r)] border" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
      {/* LogRow의 좌우 여백(px-4)과 맞춰야 머리글과 그 아래 날짜·칩이
          왼쪽으로 나란히 정렬된다(px-5였을 때 머리글이 살짝 더 들어가
          보인다는 지적). */}
      <div className="flex items-end justify-between gap-2 px-4 pt-5 pb-2">
        <p className="d text-lg leading-none">
          {heading}
          {headingSub && (
            <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--ink-2)" }}>
              {headingSub}
            </span>
          )}
        </p>
        {headingRight && (
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            {headingRight}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** "26-09-06" -- 목록 줄의 작은 날짜. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y.slice(2)}-${m}-${d}`;
}

/** "9/6" -- 목록 줄의 큰 날짜. */
export function shortMd(iso: string | null | undefined): string {
  if (!iso) return "";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** "2026-09" 키와 "2026년 9월" 머리글. */
export function monthOf(iso: string | null | undefined): { key: string; label: string } {
  if (!iso) return { key: "", label: "날짜 없음" };
  const [y, m] = iso.slice(0, 10).split("-");
  return { key: `${y}-${m}`, label: `${y}년 ${Number(m)}월` };
}
