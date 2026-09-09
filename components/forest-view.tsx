"use client";

import { useState } from "react";
import Link from "next/link";
import Illustration, { AvatarIllustration, type Avatar, type IllustrationName } from "@/components/illustration";

export type ForestTree = {
  id: string;
  bookId: string;
  title: string;
  readDate: string;
};

// 나무 모양·크기는 책 id 해시로 고정 배정한다 -- 같은 책은 언제 봐도
// 같은 나무라서, 아이가 "이 나무는 알사탕이야" 하고 기억할 수 있다.
const TREES: IllustrationName[] = ["tree-light", "tree-bushy", "tree-round", "tree-pine"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// 별은 나무 수에 비례해 몇 개만, 숲 위쪽에 고정 위치로 흩뿌린다.
const STAR_SPOTS = [
  [4, 3],
  [22, 8],
  [41, 2],
  [58, 9],
  [76, 4],
  [93, 7],
  [13, 15],
  [66, 17],
  [88, 14],
  [33, 20],
];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export default function ForestView({
  childName,
  avatar,
  trees,
}: {
  childName: string;
  avatar: Avatar | null | undefined;
  trees: ForestTree[];
}) {
  const [picked, setPicked] = useState<ForestTree | null>(null);
  const starCount = Math.min(STAR_SPOTS.length, 2 + Math.floor(trees.length / 8));

  if (trees.length === 0) {
    return (
      <div>
        <p className="hand text-xl" style={{ color: "var(--point-deep)" }}>
          {childName}의 숲은 아직 빈 들판이에요
        </p>
        <div
          className="mt-4 flex items-end justify-center gap-3 rounded-[var(--r)] px-4 pt-10 pb-6"
          style={{ background: "#DCE6D0" }}
        >
          <AvatarIllustration avatar={avatar} height={96} />
          <Illustration name="bear-lantern" height={120} />
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          책 한 권을 다 읽을 때마다 나무가 한 그루씩 자라요. 첫 책을 기록하면 첫 나무가 서요.
        </p>
        <Link
          href="/library/add"
          className="d mt-4 block rounded-[14px] py-3 text-center text-sm text-white"
          style={{ background: "var(--point)" }}
        >
          첫 나무 심으러 가기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="hand text-xl" style={{ color: "var(--point-deep)", wordBreak: "keep-all" }}>
        {childName}의 숲에 나무 {trees.length}그루가 자랐어요
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        책 한 권을 다 읽을 때마다 나무가 한 그루 자라요. 나무를 눌러 보세요.
      </p>

      {/* 누른 나무가 어떤 책인지 -- 숲 위에 고정된 한 줄이라 아이가 나무를
          차례로 눌러 보며 "이건 뭐였지" 하고 놀 수 있다. */}
      <div
        className="mt-4 flex min-h-[52px] items-center gap-3 rounded-[16px] border px-4 py-2.5"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        aria-live="polite"
      >
        {picked ? (
          <>
            <Illustration name={TREES[hash(picked.bookId) % TREES.length]} height={32} className="flex-none" />
            <div className="min-w-0">
              <p className="d truncate text-sm">{picked.title || "제목 없는 책"}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {formatDate(picked.readDate)}에 심은 나무
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            나무를 누르면 어떤 책인지 알려줘요.
          </p>
        )}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[var(--r)] px-3 pt-10 pb-4" style={{ background: "#DCE6D0" }}>
        {STAR_SPOTS.slice(0, starCount).map(([left, top], i) => (
          <Illustration
            key={i}
            name="star"
            height={i % 3 === 0 ? 13 : 10}
            className="absolute"
            style={{ left: `${left}%`, top: `${top}px` }}
          />
        ))}

        <div className="flex flex-wrap items-end gap-x-1 gap-y-4">
          {trees.map((tree, i) => {
            const h = hash(tree.bookId);
            const name = TREES[h % TREES.length];
            const height = 40 + (h % 5) * 3 + (name === "tree-pine" ? 8 : 0);
            const active = picked?.id === tree.id;
            return (
              <button
                key={tree.id}
                type="button"
                onClick={() => setPicked(active ? null : tree)}
                aria-label={`${tree.title || "책"} -- ${i + 1}번째 나무`}
                className="flex-none rounded-md transition-transform"
                style={{
                  transform: active ? "scale(1.18)" : undefined,
                  filter: active ? "drop-shadow(0 2px 3px rgba(38,54,43,0.35))" : undefined,
                }}
              >
                <Illustration name={name} height={height} />
              </button>
            );
          })}
          {/* 숲길 끝에 아이와 곰 -- 오늘 탭의 이번 달 숲과 같은 구도 */}
          <span className="ml-auto flex flex-none items-end gap-1 pl-2">
            <AvatarIllustration avatar={avatar} height={56} />
            <Illustration name="bear-lantern" height={72} />
          </span>
        </div>
      </div>
    </div>
  );
}
