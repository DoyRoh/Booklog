import type { SVGProps } from "react";

// "어떤 기분이 들었어?" 스티커 여덟 개의 표정. 평점 스티커(record-icons.tsx)와
// 같은 규칙 -- 24 viewBox, 색 블롭 위에 흰 stroke 선으로 손으로 그린 얼굴.
// 이모지·클립아트가 아니라 직접 그린 벡터.

type IconProps = SVGProps<SVGSVGElement>;

function Face({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** 무서웠어 -- 동그래진 눈, 올라간 눈썹, 떨리는 입. */
export function ScaredIcon(props: IconProps) {
  return (
    <Face {...props}>
      <path d="M6 7.2q1.6-1.8 3.2 0M14.8 7.2q1.6-1.8 3.2 0" />
      <circle cx="8.6" cy="11" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="11" r="1.7" fill="currentColor" stroke="none" />
      <path d="M8 17q1.3-1.6 2.6 0t2.7 0 2.7 0" />
    </Face>
  );
}

/** 웃겼어 -- 감긴 눈, 활짝 벌린 입, 눈가의 웃음 눈물. */
export function LaughIcon(props: IconProps) {
  return (
    <Face {...props}>
      <path d="M6.5 9.5q1.6-2.2 3.2 0M14.3 9.5q1.6-2.2 3.2 0" />
      <path d="M7 13h10q0 5.2-5 5.2T7 13z" fill="currentColor" stroke="none" />
      <path d="M19.6 10.2l1.2 2.1" />
    </Face>
  );
}

/** 슬펐어 -- 처진 눈, 눈물 한 방울, 내려간 입. */
export function SadIcon(props: IconProps) {
  return (
    <Face {...props}>
      <path d="M6.5 9.8q1.6 1.6 3.2 0M14.3 9.8q1.6 1.6 3.2 0" />
      <path
        d="M17.6 12.2c0 1.6-1.3 2.4-1.3 3.5a1.3 1.3 0 0 0 2.6 0c0-1.1-1.3-1.9-1.3-3.5z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M8.2 17.4q3.8-3 7.6 0" />
    </Face>
  );
}

/** 신기했어 -- 반짝이는 큰 눈, 동그란 입, 별빛. */
export function WowIcon(props: IconProps) {
  return (
    <Face {...props}>
      <circle cx="8.6" cy="10.4" r="2.1" />
      <circle cx="15.4" cy="10.4" r="2.1" />
      <circle cx="12" cy="16.2" r="1.9" />
      <path d="M19.8 3.4v2.8M18.4 4.8h2.8M4 5.2v2M3 6.2h2" strokeWidth={1.6} />
    </Face>
  );
}

/** 뭉클했어 -- 가슴에 차오르는 하트. */
export function TouchedIcon(props: IconProps) {
  return (
    <Face {...props}>
      <path
        d="M12 20C6.2 15.4 3.6 11.8 5.4 8.4 6.9 5.6 10.6 5.7 12 8.3c1.4-2.6 5.1-2.7 6.6.1 1.8 3.4-.8 7-6.6 11.6z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M19.6 3.2v2.4M18.4 4.4h2.4" strokeWidth={1.6} />
    </Face>
  );
}

/** 두근두근 -- 콩닥이는 하트 둘. */
export function ExcitedIcon(props: IconProps) {
  return (
    <Face {...props}>
      <path
        d="M10 20c-4.6-3.6-6.6-6.5-5.2-9.2 1.2-2.2 4.1-2.1 5.2 0 1.1-2.1 4-2.2 5.2 0 1.4 2.7-.6 5.6-5.2 9.2z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M17.5 10.4c-2.3-1.8-3.3-3.3-2.6-4.6.6-1.1 2-1 2.6 0 .6-1 2-1.1 2.6 0 .7 1.3-.3 2.8-2.6 4.6z"
        fill="currentColor"
        stroke="none"
      />
    </Face>
  );
}

/** 화났어 -- 치켜뜬 눈썹, 꾹 다문 입, 김. */
export function AngryIcon(props: IconProps) {
  return (
    <Face {...props}>
      <path d="M6.2 8l4 2.2M17.8 8l-4 2.2" />
      <circle cx="8.8" cy="12.6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.2" cy="12.6" r="1.5" fill="currentColor" stroke="none" />
      <path d="M8.8 17.6h6.4" />
      <path d="M20 3.6q1 1-.1 2t0 2" strokeWidth={1.6} />
    </Face>
  );
}

/** 따뜻했어 -- 김이 오르는 찻잔. */
export function WarmIcon(props: IconProps) {
  return (
    <Face {...props}>
      <path d="M5.5 10.5h10.5v5.5a3.5 3.5 0 0 1-3.5 3.5h-3.5a3.5 3.5 0 0 1-3.5-3.5z" />
      <path d="M16 12.2h1.4a2.1 2.1 0 0 1 0 4.2H16" />
      <path d="M8.6 7.4q-1.2-1.6 0-3.2M12.6 7.4q-1.2-1.6 0-3.2" strokeWidth={1.6} />
    </Face>
  );
}
