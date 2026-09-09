import type { ReactNode } from "react";
import Link from "next/link";

// "날짜 · 카테고리 칩 · 내용" 한 줄 목록 -- 사용자가 보여준 육아 기록 앱의
// 목록 형식을 추천도서·숙제 목록(숲지기 화면과 아이 화면 모두)에 그대로
// 쓴다. 왼쪽 날짜(위 굵게, 아래 회색), 가운데 색 칩(+아래 작은 보조 라벨),
// 오른쪽 제목(+회색 부제). 줄 사이는 옅은 구분선.

export type LogChip = { label: string; color: string; sub?: string };

export function LogRow({
  dateTop,
  dateBottom,
  chip,
  title,
  subtitle,
  right,
  href,
  onClick,
  first,
  children,
}: {
  dateTop: string;
  dateBottom?: string;
  chip: LogChip;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  href?: string;
  onClick?: () => void;
  first?: boolean;
  /** 제목 아래에 들어가는 확장 내용(숙제의 책 목록·미션 등). */
  children?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex w-14 flex-none flex-col pt-0.5">
        <span className="d text-sm leading-tight" style={{ color: "var(--ink-2)" }}>
          {dateTop}
        </span>
        {dateBottom && (
          <span className="text-[10px] leading-tight" style={{ color: "var(--ink-2)", opacity: 0.8 }}>
            {dateBottom}
          </span>
        )}
      </div>
      <div className="flex w-12 flex-none flex-col items-center gap-0.5">
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
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug" style={{ wordBreak: "keep-all" }}>
            {title}
          </p>
          {right && <span className="flex-none">{right}</span>}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--ink-2)" }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </>
  );
  const cls = "flex w-full items-start gap-2 px-3 py-3 text-left";
  const style = first ? undefined : { borderTop: "1px solid rgba(38,54,43,0.08)" };
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} style={style}>
        {body}
      </button>
    );
  }
  return (
    <div className={cls} style={style}>
      {body}
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
      <div className="flex items-end justify-between gap-2 px-4 pt-4 pb-2">
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
