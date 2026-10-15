"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUP_TYPE_LABELS } from "@/lib/group-labels";

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
}: {
  groups: OpenGroup[];
  followingIds: string[];
  activeChildId: string | null;
}) {
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

  const keepers = groupByKeeper(groups);

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
      {keepers.map((keeper) => (
        <div
          key={keeper.key}
          className="flex gap-3 rounded-[18px] border py-3 pl-3"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {/* 왼쪽: 숲지기 얼굴과 이름 */}
          <div className="flex w-[64px] flex-none flex-col items-center pt-1 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/illustrations/face-${keeper.avatar}.png`}
              alt=""
              className="h-12 w-12 rounded-full border"
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
              const cover = group.covers?.[0];
              return (
                <div key={group.id} className="relative w-[100px] flex-none">
                  <Link href={`/recommend/${group.id}`} className="block">
                    <div
                      className="flex h-[120px] w-full items-center justify-center overflow-hidden rounded-[10px]"
                      style={{ background: "var(--paper)" }}
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="d px-2 text-center text-xs" style={{ color: "var(--ink-2)", wordBreak: "keep-all" }}>
                          {GROUP_TYPE_LABELS[group.type] ?? group.type}
                        </span>
                      )}
                    </div>
                    <p
                      className="d mt-1.5 text-xs leading-[16px]"
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
                  <button
                    type="button"
                    disabled={pending === group.id}
                    onClick={() => (following ? unfollow(group.id) : follow(group.id))}
                    aria-label={following ? `${group.name} 팔로우 끊기` : `${group.name} 팔로우`}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-40"
                    style={{
                      background: following ? "var(--point-deep)" : "var(--card)",
                      border: following ? "none" : "1.5px solid var(--point-deep)",
                      boxShadow: "0 1px 3px rgba(38,54,43,0.25)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      {following ? (
                        <path d="M3 7.2l2.6 2.6L11 4.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M7 2.5v9M2.5 7h9" stroke="var(--point-deep)" strokeWidth="2" strokeLinecap="round" />
                      )}
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
