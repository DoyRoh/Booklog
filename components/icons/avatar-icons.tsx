import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={32}
      height={32}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function RabbitIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.8 10.5C7.6 7.8 7.2 4.8 8.2 3.4c1-1.4 2.4.4 2.6 3.4.15 2 .05 3.6-.2 4.7" />
      <path d="M15.2 10.5c1.2-2.7 1.6-5.7.6-7.1-1-1.4-2.4.4-2.6 3.4-.15 2-.05 3.6.2 4.7" />
      <circle cx="12" cy="15" r="5.4" />
      <path d="M9.6 15.2c.5.6 1.3 1 2.4 1s1.9-.4 2.4-1" />
      <circle cx="9.9" cy="13.8" r=".55" fill="currentColor" stroke="none" />
      <circle cx="14.1" cy="13.8" r=".55" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function DogIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 8c-1.8.6-2.8 2.6-2.3 5.1.4 2.1 1.7 3.6 2.9 3.6" />
      <path d="M17.5 8c1.8.6 2.8 2.6 2.3 5.1-.4 2.1-1.7 3.6-2.9 3.6" />
      <circle cx="12" cy="14" r="6" />
      <path d="M9.7 16.3c.6.5 1.4.8 2.3.8s1.7-.3 2.3-.8" />
      <circle cx="9.6" cy="12.6" r=".55" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="12.6" r=".55" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="14.6" rx="1" ry=".75" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function CatIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.2 9.5 6 4.3l4 3.1" />
      <path d="M16.8 9.5 18 4.3l-4 3.1" />
      <circle cx="12" cy="14.2" r="5.8" />
      <path d="M4.5 15.2h3.4M4.8 17.2h3.3M16.1 15.2h3.4M15.8 17.2h3.3" />
      <circle cx="9.7" cy="13" r=".55" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="13" r=".55" fill="currentColor" stroke="none" />
      <path d="M11.2 14.6h1.6l-.8 1z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
