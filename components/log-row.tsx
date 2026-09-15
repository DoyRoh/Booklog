import type { ReactNode } from "react";
import Link from "next/link";

// "칩 · 내용 · 날짜/상태" 한 줄 목록 -- 사용자가 보여준 육아 기록 앱의
// 목록 형식을 숲지기의 추천도서·숙제 관리 목록에 쓴다. 왼쪽 색 칩(+아래
// 작은 보조 라벨), 가운데 제목(+회색 부제), 오른쪽 위 작은 날짜 + 그
// 아래 상태·개수 배지. 날짜를 처음엔 맨 왼쪽 전용 칸에 뒀는데 "위치가
// 쌩뚱맞다"는 지적으로 오른쪽 위로 옮겼다. 줄 사이는 옅은 구분선.

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
  // 날짜는 왼쪽 전용 칸이 아니라 오른쪽 위 작은 글자로 -- "날짜 위치가
  // 쌩뚱맞다"는 지적으로, 상태·개수 배지와 같은 열 위쪽에 둔다.
  const chipCol = (
    <div className="flex w-11 flex-none flex-col items-center gap-0.5">
      {/* 순번은 칩 칸 위에 작게. */}
      {index !== undefined && (
        <span className="text-[10px] leading-none tabular-nums" style={{ color: "var(--ink-2)", opacity: 0.6 }}>
          {index}
        </span>
      )}
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
  // 날짜(등록일 등)는 상태·개수 배지 바로 위, 오른쪽 끝에 작게 둔다.
  const dateNode =
    !hideDate && dateTop ? (
      <span className="whitespace-nowrap text-[10px] leading-tight" style={{ color: "var(--ink-2)" }}>
        {dateTop}
        {dateBottom && <span style={{ opacity: 0.7 }}> · {dateBottom}</span>}
      </span>
    ) : null;
  // 오른쪽에 토글 버튼이 있으면(rightInteractive) 링크 밖에 두고, 글자만
  // 있으면 링크 안에 넣어 줄 전체가 눌리게 한다(a 안에 button 중첩 금지).
  const rightCol =
    dateNode || right ? (
      <span className="flex flex-none flex-col items-end gap-1">
        {dateNode}
        {right}
      </span>
    ) : null;
  const main = (
    <>
      {chipCol}
      {text}
      {!rightInteractive && rightCol}
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
    <div
      className="flex w-full items-stretch gap-2 px-4 py-3.5"
      style={first ? undefined : { borderTop: "1px solid rgba(38,54,43,0.08)" }}
    >
      {mainEl}
      {rightInteractive && rightCol}
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
