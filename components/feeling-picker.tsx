"use client";

import type { ComponentType, SVGProps } from "react";
import { FEELINGS, type FeelingKey } from "@/lib/feelings";
import {
  ScaredIcon,
  LaughIcon,
  SadIcon,
  WowIcon,
  TouchedIcon,
  ExcitedIcon,
  AngryIcon,
  WarmIcon,
} from "@/components/icons/feeling-icons";

const ICONS: Record<FeelingKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  scared: ScaredIcon,
  funny: LaughIcon,
  sad: SadIcon,
  wow: WowIcon,
  touched: TouchedIcon,
  excited: ExcitedIcon,
  angry: AngryIcon,
  warm: WarmIcon,
};

// 블롭 모양을 스티커마다 조금씩 다르게 -- 전부 같은 방울이면 도장 찍은
// 것처럼 보인다. 평점 스티커와 같은 계열의 손으로 오린 듯한 둥근 사각.
const BLOBS = [
  "38% 62% 68% 32% / 58% 42% 58% 42%",
  "62% 38% 40% 60% / 44% 60% 40% 56%",
  "50% 50% 36% 64% / 60% 38% 62% 40%",
  "42% 58% 58% 42% / 40% 56% 44% 60%",
];

/**
 * "어떤 기분이 들었어?" -- 딱 두 줄(4×2), 여러 개 고를 수 있는 기분 스티커.
 * 고르면 블롭이 톡 튀어오르고(sticker-pop), 다시 누르면 빠진다.
 */
export default function FeelingPicker({
  value,
  onChange,
}: {
  value: FeelingKey[];
  onChange: (value: FeelingKey[]) => void;
}) {
  function toggle(key: FeelingKey) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {FEELINGS.map(({ key, label, color }, i) => {
        const Icon = ICONS[key];
        const active = value.includes(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(key)}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border py-2.5"
            style={{
              borderColor: active ? "var(--point)" : "var(--rule)",
              background: active ? "rgba(47,168,79,0.06)" : "var(--card)",
            }}
          >
            {/* key를 바꿔 다시 마운트시켜야 고를 때마다 애니메이션이 새로 돈다 */}
            <span
              key={active ? "on" : "off"}
              className={`flex items-center justify-center text-white${active ? " sticker-pop" : ""}`}
              style={{
                width: 34,
                height: 34,
                background: color,
                borderRadius: BLOBS[i % BLOBS.length],
                opacity: active ? 1 : 0.5,
                transform: active ? undefined : `rotate(${i % 2 ? 3 : -3}deg)`,
              }}
            >
              <Icon width={19} height={19} />
            </span>
            <span className="d text-xs" style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
