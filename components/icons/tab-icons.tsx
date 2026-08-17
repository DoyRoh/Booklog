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
