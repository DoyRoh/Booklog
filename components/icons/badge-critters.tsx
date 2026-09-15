// 배지 전용 작은 생물 그림 -- 곰·새는 이제 "그룹 숲지기 수"를 보여주는
// 자리에만 쓰고(우리 숲 숲지기 캐릭터), 사진·목소리·이야기꾼 배지는 겹치지
// 않게 새로 그렸다. 사용자가 참고로 보내준 인터넷 그림(수채 정물화 느낌의
// 나비·무당벌레·달팽이 등)은 저작권이 불분명해 그대로 쓰지 않고, 톤·소재만
// 살짝 빌려 손으로 새로 그린 단순한 선/면 벡터 아이콘이다(이 프로젝트의
// "커스텀 오리지널 그래픽만" 원칙, 이모지·클립아트 금지 원칙을 따름).
import type { CSSProperties } from "react";

type Props = { height: number; className?: string; style?: CSSProperties };

/** 사진 배지 -- 장면을 담다 -> 꽃 사이를 오가는 나비. */
export function ButterflyIcon({ height, className, style }: Props) {
  const w = Math.round(height * 1.25);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 40 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M19 8c-2-5-8-7-11-4s-1 9 4 10.5C16 16 19 12 19 8Z"
        fill="#E8A6C1"
      />
      <path
        d="M21 8c2-5 8-7 11-4s1 9-4 10.5C24 16 21 12 21 8Z"
        fill="#8FB8D8"
      />
      <path
        d="M18.5 15c-1.5-2-6-2.5-7.5 0.5s0.5 6.5 4 6.5c2.5 0 3.5-4.5 3.5-7Z"
        fill="#F0BFD4"
      />
      <path
        d="M21.5 15c1.5-2 6-2.5 7.5 0.5s-0.5 6.5-4 6.5c-2.5 0-3.5-4.5-3.5-7Z"
        fill="#A9CBE0"
      />
      <path d="M20 6.5c0 6 0 13 0 18" stroke="#4C412F" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 7c-1-2-2.4-3-3.6-3.2M20 7c1-2 2.4-3 3.6-3.2" stroke="#4C412F" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** 목소리 배지 -- 재잘재잘 -> 동그랗고 발랄한 무당벌레. */
export function LadybugIcon({ height, className, style }: Props) {
  const w = Math.round(height * 1.15);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 32 28"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M16 6c7 0 11 4.5 11 10s-4 8-11 8S5 21.6 5 16 9 6 16 6Z" fill="#D9583E" />
      <path d="M16 6v18" stroke="#33261D" strokeWidth="1.4" />
      <circle cx="11.5" cy="14" r="1.7" fill="#33261D" />
      <circle cx="20.5" cy="14" r="1.7" fill="#33261D" />
      <circle cx="12.5" cy="20" r="1.5" fill="#33261D" />
      <circle cx="19.5" cy="20" r="1.5" fill="#33261D" />
      <path d="M8 8.5C8 5 11.5 3 16 3s8 2 8 5.5c0 1.6-3.6 2.5-8 2.5S8 10.1 8 8.5Z" fill="#26201A" />
      <circle cx="13.5" cy="7.5" r="0.9" fill="#F4EFE8" />
      <circle cx="18.5" cy="7.5" r="0.9" fill="#F4EFE8" />
    </svg>
  );
}

/** 이야기꾼 배지 -- 이야기를 등에 지고 천천히, 오래 -> 달팽이. */
export function SnailIcon({ height, className, style }: Props) {
  const w = Math.round(height * 1.3);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 36 28"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M23 22c-6.5 1.6-13.5-1.8-14.6-7.6C7.3 9.2 11.6 4.3 17 4.3c4.4 0 8 3 8 6.7 0 3-2.4 5.3-5.4 5.3-2.4 0-4.4-1.7-4.4-3.9 0-1.7 1.4-3.1 3.1-3.1"
        stroke="#8A6A44"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22.5 22.3c1 3.4-2.6 5-6.4 3.7C10 24 4 19 4 15c0-2 1.4-3.4 3.3-3.4 2.4 0 4 2.3 3.5 4.8-.3 1.6-2 2.4-3.3 1.7"
        fill="#E3C79B"
      />
      <circle cx="4.6" cy="13.4" r="1.1" fill="#4C412F" />
      <path d="M4.6 13.4c-.6-1.2-1.7-2-2.9-2.2" stroke="#4C412F" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M6.6 12.4c-.3-1.3-1.1-2.4-2.2-3" stroke="#4C412F" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
