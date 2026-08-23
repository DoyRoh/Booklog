"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type OpenGroup = { id: string; name: string; type: string };

const TYPE_LABELS: Record<string, string> = {
  kindergarten: "유치원",
  school: "학교",
  library: "도서관",
  family: "가족",
  community: "커뮤니티",
  creator: "크리에이터",
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
            className="flex items-center justify-between gap-3 rounded-[var(--r)] border p-4"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            <Link href={`/recommend/${group.id}`} className="flex-1">
              <p className="d text-sm">{group.name}</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                {TYPE_LABELS[group.type] ?? group.type}
              </p>
            </Link>
            {following ? (
              <span className="d text-xs" style={{ color: "var(--point-deep)" }}>
                팔로잉
              </span>
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
