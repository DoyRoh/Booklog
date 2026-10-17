"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import GroupRemoveButton from "@/components/group-remove-button";
import { applyGroupOrder, loadGroupOrder, saveGroupOrder } from "@/lib/group-order";

export type OrderableGroup = { id: string; name: string; sub: string };

function Arrow({ up }: { up?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d={up ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 아이 프로필의 "내 그룹 관리" — 위/아래 화살표로 순서를 바꾸면 그룹 탭 상단 칩도 같은 순서가 된다.
export default function MyGroupsOrderable({ childId, groups }: { childId: string; groups: OrderableGroup[] }) {
  const [list, setList] = useState(groups);

  useEffect(() => {
    let cancelled = false;
    loadGroupOrder(createClient(), childId).then((order) => {
      if (!cancelled && order.length) setList(applyGroupOrder(groups, order));
    });
    return () => {
      cancelled = true;
    };
  }, [childId, groups]);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    void saveGroupOrder(createClient(), childId, next.map((g) => g.id));
  }

  return (
    <div className="flex flex-col">
      {list.map((group, index) => (
        <div
          key={group.id}
          className="flex items-center gap-2 py-[12px] pl-[16px] pr-[24px]"
          style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
        >
          {list.length > 1 && (
            <div className="flex flex-none flex-col">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`${group.name} 위로`}
                className="flex h-7 w-8 items-center justify-center rounded-[8px] disabled:opacity-20"
                style={{ color: "var(--point-deep)" }}
              >
                <Arrow up />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === list.length - 1}
                aria-label={`${group.name} 아래로`}
                className="flex h-7 w-8 items-center justify-center rounded-[8px] disabled:opacity-20"
                style={{ color: "var(--point-deep)" }}
              >
                <Arrow />
              </button>
            </div>
          )}
          <Link href={`/recommend/${group.id}`} className="min-w-0 flex-1">
            <p className="d truncate text-sm">{group.name}</p>
            <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
              {group.sub}
            </p>
          </Link>
          <GroupRemoveButton groupId={group.id} groupName={group.name} mode={{ kind: "leave-child", childId }} />
        </div>
      ))}
    </div>
  );
}
