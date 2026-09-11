import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
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

export function TodayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M6 10.2V20h12v-9.8" />
      <path d="M10 20v-5h4v5" />
    </IconBase>
  );
}

export function LibraryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="7" width="4" height="13" rx="1" />
      <rect x="9" y="4" width="4" height="16" rx="1" />
      <path d="M15.5 9.2l3.8.9-2.6 9.8-3.8-1z" />
    </IconBase>
  );
}

export function RecordsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8.5h8M8 12.5h8M8 16.5h5" />
    </IconBase>
  );
}

export function RecommendIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.5 3.5l1.6 4.3 4.3 1.6-4.3 1.6-1.6 4.3-1.6-4.3L4.6 9.4l4.3-1.6z" />
      <path d="M17.6 14.8l.85 2.3 2.3.85-2.3.85-.85 2.3-.85-2.3-2.3-.85 2.3-.85z" />
    </IconBase>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.4" />
      <rect x="13" y="4" width="7" height="7" rx="1.4" />
      <rect x="4" y="13" width="7" height="7" rx="1.4" />
      <rect x="13" y="13" width="7" height="7" rx="1.4" />
    </IconBase>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M6 10.2V20h12v-9.8" />
      <path d="M9.5 14.5h5" />
      <path d="M9.5 17.5h5" />
    </IconBase>
  );
}

export function AssignmentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <path d="M8.5 9.5l1.5 1.5 2.5-2.8" />
      <path d="M14 9.7h3.5" />
      <path d="M8.5 15.5l1.5 1.5 2.5-2.8" />
      <path d="M14 15.7h3.5" />
    </IconBase>
  );
}

export function ChildrenIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8.5" cy="8" r="2.6" />
      <circle cx="16" cy="9" r="2.1" />
      <path d="M3.5 19.5c.6-3.2 2.6-5 5-5s4.4 1.8 5 5" />
      <path d="M14.3 14.8c1.8.3 3.2 1.9 3.7 4.7" />
    </IconBase>
  );
}

// 탐험 수첩 모티프 — 배지 탭 전용. components/icons/misc-icons.tsx의
// BadgeIcon과 같은 모양이지만, 하단 내비게이션 아이콘 크기(22px)에
// 맞춘 버전이다.
export function BadgeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="9.5" r="5.5" />
      <path d="M8.7 14.2 7 21l5-2.4 5 2.4-1.7-6.8" />
    </IconBase>
  );
}

// 하단탭 "추가" -- 책장에 책을 바로 꽂는 빠른 진입점(원 안의 +).
export function AddIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </IconBase>
  );
}

// 상단바 "우리 숲" -- 전나무 한 그루(손그림 느낌의 살짝 기운 삼각형 두 단 + 기둥).
export function TreeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5l4.2 6h-2.4l3.7 5.5H6.5l3.7-5.5H7.8z" />
      <path d="M12 15v5.5" />
    </IconBase>
  );
}
