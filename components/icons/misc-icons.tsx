import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// 탐험 수첩 모티프 — 발자국 도장. 지금은 종·아바타 구분 없이 하나의 형태만
// 사용하고, 아바타별 발자국 3종(토끼/강아지/고양이)은 실제 일러스트 제작 시
// 교체한다.
export function SpineViewIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4" width="3" height="16" rx="0.8" />
      <rect x="8" y="4" width="3" height="16" rx="0.8" />
      <rect x="12.5" y="4" width="3" height="16" rx="0.8" />
      <rect x="17" y="4" width="3" height="16" rx="0.8" />
    </IconBase>
  );
}

export function CoverViewIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4" width="7.5" height="16" rx="1" />
      <rect x="13" y="4" width="7.5" height="16" rx="1" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M19.5 19.5l-4.3-4.3" />
    </IconBase>
  );
}
