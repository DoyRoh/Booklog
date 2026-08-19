import type { SVGProps } from "react";

// 레거시 "유안이 독서기록" 앱에서 쓰던 커스텀 벡터 아이콘을 그대로 옮겨왔다
// (사용자가 직접 디자인한 것으로, AI 클립아트/이모지 금지 원칙과 무관하게
// 재사용해도 된다고 확인받음).

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" fill="currentColor" />
      <path d="M3 10h18M8 2v5M16 2v5" stroke="var(--card)" strokeWidth={1.6} />
    </IconBase>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <IconBase {...props} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.6A4 4 0 018 5.6h9" />
      <path d="M14.6 3l2.6 2.6-2.6 2.6" />
      <path d="M20 14.4a4 4 0 01-4 4H7" />
      <path d="M9.4 21l-2.6-2.6L9.4 15.8" />
    </IconBase>
  );
}

export function Star5Icon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 2.5l2.9 6.2 6.6.8-4.9 4.5 1.3 6.5-5.9-3.3-5.9 3.3 1.3-6.5L2.5 9.5l6.6-.8z"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function GrinIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8.5" cy="9" r="1.7" fill="currentColor" />
      <circle cx="15.5" cy="9" r="1.7" fill="currentColor" />
      <path d="M5.5 13.5h13a6.5 6.5 0 0 1-13 0Z" fill="currentColor" />
    </IconBase>
  );
}

export function SmileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8.5" cy="9.5" r="1.6" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1.6" fill="currentColor" />
      <path d="M7 14.5a6 6 0 0 0 10 0" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    </IconBase>
  );
}

export function MehIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6.6" y="8.6" width="4" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="13.4" y="8.6" width="4" height="2.4" rx="1.2" fill="currentColor" />
      <path d="M8 15.5h8" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    </IconBase>
  );
}

export function DizzyIcon(props: IconProps) {
  return (
    <IconBase {...props} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M6.4 7.6l3.4 3.4M9.8 7.6l-3.4 3.4M14.2 7.6l3.4 3.4M17.6 7.6l-3.4 3.4" />
      <path d="M8 16c1.3-1.2 2.7-1.2 4 0s2.7 1.2 4 0" />
    </IconBase>
  );
}

export function LaughIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M6 9.5c1-1.4 3-1.4 4 0M14 9.5c1-1.4 3-1.4 4 0"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path d="M5.5 13h13a6.5 6.5 0 0 1-13 0Z" fill="currentColor" />
    </IconBase>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="currentColor" />
    </IconBase>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11Z"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8.5" r="3.6" fill="currentColor" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0Z" fill="currentColor" />
    </IconBase>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.4-2-.7-1.2.2-2.4 1.6-2.4H18a4 4 0 0 0 4-4A9.4 9.4 0 0 0 12 3Z"
        fill="currentColor"
      />
      <circle cx="8" cy="9" r="1.5" fill="var(--card)" />
      <circle cx="12.5" cy="7" r="1.5" fill="var(--card)" />
      <circle cx="7" cy="14" r="1.5" fill="var(--card)" />
    </IconBase>
  );
}

export function BulbIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2.5A6.5 6.5 0 0 0 8 14v2h8v-2a6.5 6.5 0 0 0-4-11.5Z" fill="currentColor" />
      <rect x="9" y="17.5" width="6" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="10" y="20.6" width="4" height="1.9" rx="0.95" fill="currentColor" />
    </IconBase>
  );
}
