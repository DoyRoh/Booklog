"use client";

import Image from "next/image";

// "책은 어땠어?" -- 별 다섯 개. 예전엔 최고/재밌어/좋아/보통/별로 표정
// 스티커였는데, 그 아래 "어떤 기분이 들었어?" 표정 스티커 줄이 생기면서
// "재밌어"가 기분처럼 읽히고 두 줄이 같은 질문으로 보였다(사용자 지적).
// 위는 별(점수), 아래는 표정(기분)으로 모양부터 갈라 둔다. 저장값은 그대로
// reading_records.rating 1~5.
const LABELS: Record<number, string> = {
  5: "최고야",
  4: "좋았어",
  3: "괜찮았어",
  2: "그냥 그랬어",
  1: "별로였어",
};

// 사용자가 직접 그린 크레용 별 그림(public/illustrations/star-rating.png,
// 원본은 docs/illustrations/star-rating-src.png). 벡터 별은 "이질적"이라는
// 지적으로 교체 -- 빈 별은 같은 그림을 회색·반투명으로 눌러서 모양이 똑같이
// 이어지게 한다.
const STAR_SRC = "/illustrations/star-rating.png";

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <Image
      src={STAR_SRC}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: filled ? undefined : "grayscale(1) brightness(1.15)",
        opacity: filled ? 1 : 0.32,
      }}
    />
  );
}

export function ratingLabel(value: number | null | undefined) {
  return value ? LABELS[value] ?? null : null;
}

/**
 * 목록에서 평가를 한눈에 보여주는 작은 별 묶음(채워진 개수 = 점수).
 */
export function RatingSticker({ value, size = 12 }: { value: number; size?: number }) {
  if (value < 1 || value > 5) return null;
  return (
    <span className="flex flex-none items-center gap-[1px]" title={ratingLabel(value) ?? undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= value} size={size} />
      ))}
    </span>
  );
}

export default function RatingPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-1" role="radiogroup" aria-label="책은 어땠어?">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`별 ${n}개 · ${LABELS[n]}`}
              onClick={() => onChange(value === n ? null : n)}
              className="flex h-12 w-12 items-center justify-center"
            >
              {/* 채워질 때마다 다시 마운트돼 톡 튀어오른다(기분 스티커와 같은 손맛) */}
              <span key={filled ? `on-${value}` : "off"} className={filled ? "sticker-pop" : undefined}>
                <StarIcon filled={filled} size={38} />
              </span>
            </button>
          );
        })}
      </div>
      <p
        className="d mt-1 text-center text-xs"
        style={{ color: value ? "var(--ink)" : "var(--ink-2)", minHeight: 18 }}
      >
        {value ? `별 ${value}개 · ${LABELS[value]}` : "별을 눌러 골라 봐"}
      </p>
    </div>
  );
}
