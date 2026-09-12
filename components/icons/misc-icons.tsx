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

export function ListViewIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </IconBase>
  );
}

/** 보기 전환용 채움 아이콘 두 개(시안 그대로) -- 격자 = 전면 보기, 줄 = 목록 보기.
 * 스트로크 아이콘보다 작은 크기에서 또렷해서 권수 줄 오른쪽에 작게 놓아도 읽힌다. */
export function GridViewIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

export function ListRowsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true" {...props}>
      <rect x="3" y="4.6" width="3.6" height="3.6" rx="1.1" />
      <rect x="9.4" y="5.5" width="11.6" height="1.9" rx="0.95" />
      <rect x="3" y="10.2" width="3.6" height="3.6" rx="1.1" />
      <rect x="9.4" y="11.1" width="11.6" height="1.9" rx="0.95" />
      <rect x="3" y="15.8" width="3.6" height="3.6" rx="1.1" />
      <rect x="9.4" y="16.7" width="11.6" height="1.9" rx="0.95" />
    </svg>
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

// 목록 줄 오른쪽의 두 토글 -- "읽었어요"(동그라미 체크)와 "책장에 꽂힘"(책갈피).
// 글자 대신 아이콘으로만 상태를 보여주고, 누르면 바로 바뀐다.
export function CheckCircleIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <IconBase {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M12 2.8c5 0 9.2 4.1 9.2 9.2S17 21.2 12 21.2 2.8 17 2.8 12 7 2.8 12 2.8z" />
      <path d="M7.8 12.3l2.9 2.8 5.6-6" stroke={filled ? "#fff" : "currentColor"} />
    </IconBase>
  );
}

export function BookmarkIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <IconBase {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M6.5 3.6h11c.3 0 .5.2.5.5v16.4l-6-3.9-6 3.9V4.1c0-.3.2-.5.5-.5z" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}
