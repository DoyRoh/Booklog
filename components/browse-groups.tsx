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
  bookCount?: number;
  covers?: string[];
};

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
      setError("먼저 더보기에서 아이를 등록해 주세요.");
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

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
      {groups.map((group) => {
        const following = followingIds.includes(group.id);
        return (
          <div
            key={group.id}
            className="flex items-start justify-between gap-3 rounded-[var(--r)] border p-4"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            <Link href={`/recommend/${group.id}`} className="min-w-0 flex-1">
              <p className="d text-sm">{group.name}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {group.operatorName && (
                  <>
                    <span style={{ color: "var(--point-deep)" }}>숲지기 {group.operatorName}</span>
                    {" · "}
                  </>
                )}
                {GROUP_TYPE_LABELS[group.type] ?? group.type}
                {typeof group.bookCount === "number" && ` · 추천도서 ${group.bookCount}권`}
              </p>
              {group.description && (
                <p
                  className="mt-1 text-xs"
                  style={{
                    color: "var(--ink)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {group.description}
                </p>
              )}
              {group.covers && group.covers.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {group.covers.map((cover, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={cover}
                      alt=""
                      className="h-12 w-9 flex-none rounded-[4px] object-cover"
                      style={{ boxShadow: "0 1px 2px rgba(38,54,43,0.25)" }}
                    />
                  ))}
                  <span className="self-center pl-1 text-[11px]" style={{ color: "var(--ink-2)" }}>
                    미리보기 ›
                  </span>
                </div>
              )}
            </Link>
            {following ? (
              <button
                type="button"
                disabled={pending === group.id}
                onClick={() => unfollow(group.id)}
                className="d rounded-[14px] border px-4 py-2 text-xs disabled:opacity-40"
                style={{ borderColor: "var(--rule)", color: "var(--point-deep)" }}
              >
                팔로잉
              </button>
            ) : (
              <button
                type="button"
                disabled={pending === group.id}
                onClick={() => follow(group.id)}
                className="d rounded-[14px] px-4 py-2 text-sm text-white disabled:opacity-40"
                style={{ background: "var(--point)" }}
              >
                팔로우
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
