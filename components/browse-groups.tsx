"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";
import { AGE_BANDS, AGE_BAND_HINTS, AGE_BAND_LABELS, ageBandsLabel, groupFitsBand, mainAgeBands, type AgeBand } from "@/lib/age-bands";

type OpenGroup = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  operatorName?: string | null;
  operatorAvatar?: "bear" | "egret" | null;
  ownerId?: string | null;
  verified?: boolean;
  bookCount?: number;
  followers?: number;
  covers?: string[];
  ages?: { band: AgeBand; count: number }[];
  agedCount?: number;
};

type Keeper = {
  key: string;
  name: string;
  avatar: "bear" | "egret";
  verified: boolean;
  followers: number;
  groups: OpenGroup[];
};

// 같은 숲지기(그룹장)의 그룹을 한 상자로 묶는다. 들어온 그룹 순서(공식 → 팔로워 → 책 수)를
// 숲지기 순서로도 쓴다 -- 그 숲지기의 가장 앞 그룹 자리가 상자 자리.
// 나이대 다섯. 나이를 아직 안 붙인 그룹은 칩으로 고르지 않고, 나이대를 골라도 늘 함께
// 보여 주되 맞는 그룹 뒤로 보낸다(모르는 걸 숨기지 않는다 -- 책을 흐리게 하지 않는 원칙과 같음).
type AgeChip = AgeBand;
const AGE_CHIPS: AgeChip[] = [...AGE_BANDS];

function groupByKeeper(groups: OpenGroup[]): Keeper[] {
  const keepers = new Map<string, Keeper>();
  for (const g of groups) {
    const key = g.ownerId ?? g.operatorName ?? g.id;
    let k = keepers.get(key);
    if (!k) {
      k = {
        key,
        name: g.operatorName?.trim() || "이름 없는 숲지기",
        avatar: g.operatorAvatar ?? "bear",
        verified: false,
        followers: 0,
        groups: [],
      };
      keepers.set(key, k);
    }
    k.groups.push(g);
    k.verified ||= Boolean(g.verified);
    k.followers += g.followers ?? 0;
  }
  return [...keepers.values()];
}

export default function BrowseGroups({
  groups,
  followingIds,
  activeChildId,
  childBand = null,
}: {
  groups: OpenGroup[];
  followingIds: string[];
  activeChildId: string | null;
  /** 아이의 연령 구간 -- 나이대 칩에서 처음부터 골라 두고 "우리 아이"로 표시. */
  childBand?: AgeBand | null;
}) {
  // 맨 앞 "전체"(아무것도 안 고른 상태 = 모든 그룹) + 나이대 칩(여러 개 선택).
  // 아직 연령이 붙은 그룹이 적어서 처음엔 전체로 시작한다. 나이대를 다 끄면 다시 전체.
  const [picked, setPicked] = useState<AgeChip[]>([]);
  function togglePicked(chip: AgeChip) {
    setPicked((prev) => AGE_CHIPS.filter((c) => (c === chip ? !prev.includes(c) : prev.includes(c))));
  }
  const allOn = picked.length === 0;
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const followingRef = useRef<string | null>(null);

  async function follow(groupId: string) {
    if (!activeChildId) {
      setError("먼저 위쪽 프로필에서 아이를 등록해 주세요.");
      return;
    }
    // state 업데이트를 기다리지 않고 동기적으로 막아서, 버튼을 빠르게
    // 두 번 눌러도 같은 그룹에 두 번 팔로우(중복 group_members 행)되지
    // 않게 한다.
    if (followingRef.current === groupId) return;
    followingRef.current = groupId;
    setPending(groupId);
    setError(null);

    const supabase = createClient();
    const { error: followError } = await supabase.from("group_members").insert({
      group_id: groupId,
      child_id: activeChildId,
      role: "member",
      status: "approved",
    });

    followingRef.current = null;
    setPending(null);
    if (followError) {
      // 유니크 제약 위반(23505)이면 이미 팔로우 중이라는 뜻이니 조용히
      // 새로고침만 한다.
      if (followError.code !== "23505") {
        setError(followError.message);
        return;
      }
    }
    router.refresh();
  }

  async function unfollow(groupId: string) {
    if (!activeChildId) return;
    if (followingRef.current === groupId) return;
    followingRef.current = groupId;
    setPending(groupId);
    setError(null);

    const supabase = createClient();
    const { error: unfollowError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("child_id", activeChildId);

    followingRef.current = null;
    setPending(null);
    if (unfollowError) {
      setError(unfollowError.message);
      return;
    }
    router.refresh();
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        아직 둘러볼 그룹이 없어요.
      </p>
    );
  }

  // 고른 나이대 중 하나라도 그 그룹의 주 연령(연령 정해진 책의 3분의 1 이상)이면 "맞는 그룹".
  // 나이를 안 붙인 그룹은 숨기지 않고 맞는 그룹 뒤에 둔다. 전체일 땐 원래 순서 그대로.
  const untagged = (g: OpenGroup) => (g.agedCount ?? 0) === 0;
  const matches = (g: OpenGroup) =>
    picked.some((chip) => groupFitsBand(g.ages ?? [], g.agedCount ?? 0, chip) === true);
  const shown = allOn ? groups : groups.filter((g) => untagged(g) || matches(g));
  const hiddenCount = groups.length - shown.length;
  let keepers = groupByKeeper(shown);
  // 나이대를 골랐으면: 숲지기 상자 안에서도 맞는 그룹을 앞으로, 맞는 그룹이 있는 숲지기를 앞으로.
  // 나눠 담는 상자를 따로 만들지 않고 한 목록 안에서 순서만 바꾼다(스크롤이 늘지 않게).
  let firstUntaggedKeeper = -1;
  if (!allOn) {
    keepers = keepers.map((k) => ({ ...k, groups: [...k.groups].sort((a, b) => Number(untagged(a)) - Number(untagged(b))) }));
    const withMatch = keepers.filter((k) => k.groups.some((g) => !untagged(g)));
    const onlyUntagged = keepers.filter((k) => k.groups.every(untagged));
    keepers = [...withMatch, ...onlyUntagged];
    if (withMatch.length > 0 && onlyUntagged.length > 0) firstUntaggedKeeper = withMatch.length;
  }
  const matchCount = allOn ? 0 : shown.filter((g) => !untagged(g)).length;

  return (
    <div className="flex flex-col gap-3">
      {/* 나이대 -- 가로로 넘기는 칩, 여러 개 고를 수 있다(다시 누르면 해제). */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          type="button"
          onClick={() => setPicked([])}
          aria-pressed={allOn}
          className="d flex flex-none flex-col items-center rounded-[14px] border px-3.5 py-1.5 text-xs leading-tight"
          style={{
            borderColor: allOn ? "var(--point-deep)" : "var(--rule)",
            background: allOn ? "var(--point-deep)" : "var(--card)",
            color: allOn ? "#fff" : "var(--ink-2)",
          }}
        >
          전체
          <span className="text-[10px]" style={{ opacity: 0.75 }}>
            모든 그룹
          </span>
        </button>
        {AGE_CHIPS.map((band) => {
          const on = picked.includes(band);
          return (
            <button
              key={band}
              type="button"
              onClick={() => togglePicked(band)}
              aria-pressed={on}
              className="d flex flex-none flex-col items-center rounded-[14px] border px-3.5 py-1.5 text-xs leading-tight"
              style={{
                borderColor: on ? "var(--point-deep)" : "var(--rule)",
                background: on ? "var(--point-deep)" : "var(--card)",
                color: on ? "#fff" : "var(--ink-2)",
              }}
            >
              {AGE_BAND_LABELS[band]}
              <span className="text-[10px]" style={{ opacity: 0.75 }}>
                {band === childBand ? "우리 아이" : AGE_BAND_HINTS[band]}
              </span>
            </button>
          );
        })}
      </div>
      {/* 칩 아래 한 줄 요약 -- 따로 상자를 만들지 않는다. */}
      {!allOn && (
        <p className="-mt-1 text-[11px]" style={{ color: "var(--ink-2)" }}>
          맞는 그룹 {matchCount}개
          {shown.length > matchCount && ` · 나이 정보 없는 그룹 ${shown.length - matchCount}개는 뒤에`}
          {hiddenCount > 0 && ` · ${hiddenCount}개 숨김`}
        </p>
      )}
      {keepers.length === 0 && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          고른 나이대에 맞는 그룹이 아직 없어요. 나이대를 더 고르거나 전체로 보세요.
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
      {keepers.map((keeper, ki) => (
        <Fragment key={keeper.key}>
        {/* 맞는 그룹과 나이 정보 없는 그룹 사이 -- 얇은 선 한 줄만 */}
        {ki === firstUntaggedKeeper && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--ink-2)" }}>
            <span className="h-px flex-1" style={{ background: "rgba(38,54,43,0.12)" }} />
            나이 정보가 아직 없는 그룹
            <span className="h-px flex-1" style={{ background: "rgba(38,54,43,0.12)" }} />
          </div>
        )}
        <div
          className="flex gap-2.5 rounded-[18px] border py-2.5 pl-2.5"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {/* 왼쪽: 숲지기 얼굴과 이름 */}
          <div className="flex w-[64px] flex-none flex-col items-center pt-1 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/illustrations/face-${keeper.avatar}.png`}
              alt=""
              className="h-10 w-10 rounded-full border"
              style={{ borderColor: "var(--rule)" }}
            />
            <p
              className="d mt-1.5 text-[11px] leading-[14px]"
              style={{ wordBreak: "keep-all", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {keeper.name}
            </p>
            {keeper.verified && (
              <span
                className="d mt-1 rounded-full px-1.5 py-[1px] text-[9px]"
                style={{ background: "var(--point-deep)", color: "#fff" }}
              >
                책숲 공식
              </span>
            )}
            <p className="mt-0.5 text-[10px]" style={{ color: "var(--ink-2)" }}>
              그룹 {keeper.groups.length}
              {keeper.followers > 0 && ` · ${keeper.followers}명`}
            </p>
          </div>

          {/* 오른쪽: 그 숲지기의 그룹들, 가로로 넘겨 본다 */}
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pr-3" style={{ scrollbarWidth: "none" }}>
            {keeper.groups.map((group) => {
              const following = followingIds.includes(group.id);
              const covers = (group.covers ?? []).slice(0, 4);
              return (
                <div key={group.id} className="relative w-[76px] flex-none">
                  <Link href={`/recommend/${group.id}`} className="block">
                    {covers.length > 0 ? (
                      // 추천도서 표지 최대 4장을 2×2로 — 그룹의 성격이 한눈에 보이게
                      <div
                        className="grid h-[100px] w-full grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden rounded-[10px]"
                        style={{ background: "var(--rule)" }}
                      >
                        {[0, 1, 2, 3].map((i) =>
                          covers[i] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={covers[i]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div key={i} style={{ background: "var(--paper)" }} />
                          ),
                        )}
                      </div>
                    ) : (
                      <div
                        className="flex h-[100px] w-full items-center justify-center overflow-hidden rounded-[10px]"
                        style={{ background: "var(--paper)" }}
                      >
                        <span className="d px-2 text-center text-xs" style={{ color: "var(--ink-2)", wordBreak: "keep-all" }}>
                          {GROUP_TYPE_LABELS[group.type] ?? group.type}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const main = mainAgeBands(group.ages ?? [], group.agedCount ?? 0);
                      return (
                        // 나이 정보가 없으면 같은 자리에 옅게 -- 줄 높이를 지켜 타일 높이가 들쭉날쭉하지 않게.
                        <p
                          className="mt-1 truncate text-[10px] leading-[13px]"
                          style={{ color: main.length > 0 ? "var(--point-deep)" : "var(--ink-2)", opacity: main.length > 0 ? 1 : 0.6 }}
                        >
                          {main.length > 0 ? ageBandsLabel(main) : "나이 정보 없음"}
                        </p>
                      );
                    })()}
                    <p
                      className="d text-[11px] leading-[14px]"
                      style={{ wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {group.name}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--ink-2)" }}>
                      {typeof group.bookCount === "number" && `${group.bookCount}권`}
                      {typeof group.followers === "number" && group.followers > 0 && ` · 팔로워 ${group.followers}`}
                    </p>
                  </Link>
                  {/* 표지 오른쪽 위의 작은 동그라미: + 팔로우 / 체크 = 팔로잉(누르면 끊기) */}
                  {activeChildId && (
                  <button
                    type="button"
                    disabled={pending === group.id}
                    onClick={() => (following ? unfollow(group.id) : follow(group.id))}
                    aria-label={following ? `${group.name} 팔로우 끊기` : `${group.name} 팔로우`}
                    className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-40"
                    style={{
                      background: following ? "var(--point-deep)" : "var(--card)",
                      border: following ? "none" : "1.5px solid var(--point-deep)",
                      boxShadow: "0 1px 3px rgba(38,54,43,0.25)",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      {following ? (
                        <path d="M3 7.2l2.6 2.6L11 4.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M7 2.5v9M2.5 7h9" stroke="var(--point-deep)" strokeWidth="2" strokeLinecap="round" />
                      )}
                    </svg>
                  </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </Fragment>
      ))}
    </div>
  );
}
