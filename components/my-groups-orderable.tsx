"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import GroupRemoveButton from "@/components/group-remove-button";
import { applyGroupOrder, loadGroupOrder, saveGroupOrder } from "@/lib/group-order";

export type OrderableGroup = { id: string; name: string; sub: string; avatar: "bear" | "egret" };

// 손잡이(점 여섯 개) -- 꾹 잡고 위아래로 끌어 순서를 바꾼다.
function GripIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor" aria-hidden>
      {[5, 11, 17].map((y) => (
        <g key={y}>
          <circle cx="6" cy={y} r="1.9" />
          <circle cx="12" cy={y} r="1.9" />
        </g>
      ))}
    </svg>
  );
}

// 아이 프로필의 "내 그룹 관리" -- 왼쪽 손잡이를 끌어 순서를 바꾸면 그룹 탭 상단 칩도 같은 순서가 된다.
export default function MyGroupsOrderable({ childId, groups }: { childId: string; groups: OrderableGroup[] }) {
  const [list, setList] = useState(groups);
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ index: number; startY: number; heights: number[] } | null>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  }, [list]);

  useEffect(() => {
    let cancelled = false;
    loadGroupOrder(createClient(), childId).then((order) => {
      if (!cancelled && order.length) setList(applyGroupOrder(groups, order));
    });
    return () => {
      cancelled = true;
    };
  }, [childId, groups]);

  function onDown(e: React.PointerEvent, index: number) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      index,
      startY: e.clientY,
      heights: rows.current.map((r) => r?.getBoundingClientRect().height ?? 64),
    };
    setDragId(listRef.current[index].id);
    setOffset(0);
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    let dy = e.clientY - d.startY;
    const cur = listRef.current;
    // 옆 줄 높이의 절반을 넘으면 자리를 바꾸고, 기준점을 그만큼 옮긴다.
    if (dy > 0 && d.index < cur.length - 1 && dy > d.heights[d.index + 1] / 2) {
      const next = [...cur];
      [next[d.index], next[d.index + 1]] = [next[d.index + 1], next[d.index]];
      d.startY += d.heights[d.index + 1];
      [d.heights[d.index], d.heights[d.index + 1]] = [d.heights[d.index + 1], d.heights[d.index]];
      d.index += 1;
      listRef.current = next;
      setList(next);
      dy = e.clientY - d.startY;
    } else if (dy < 0 && d.index > 0 && -dy > d.heights[d.index - 1] / 2) {
      const next = [...cur];
      [next[d.index], next[d.index - 1]] = [next[d.index - 1], next[d.index]];
      d.startY -= d.heights[d.index - 1];
      [d.heights[d.index], d.heights[d.index - 1]] = [d.heights[d.index - 1], d.heights[d.index]];
      d.index -= 1;
      listRef.current = next;
      setList(next);
      dy = e.clientY - d.startY;
    }
    setOffset(dy);
  }

  function onUp() {
    if (!drag.current) return;
    drag.current = null;
    setDragId(null);
    setOffset(0);
    void saveGroupOrder(createClient(), childId, listRef.current.map((g) => g.id));
  }

  const canDrag = list.length > 1;

  return (
    <div className="flex flex-col">
      {list.map((group, index) => {
        const dragging = dragId === group.id;
        return (
          <div
            key={group.id}
            ref={(el) => {
              rows.current[index] = el;
            }}
            className="relative flex items-center gap-3 py-[12px] pl-[10px] pr-[24px]"
            style={{
              borderTop: index > 0 ? "1px solid rgba(38,54,43,0.08)" : undefined,
              background: "var(--card)",
              transform: dragging ? `translateY(${offset}px) scale(1.02)` : undefined,
              boxShadow: dragging ? "0 8px 20px rgba(38,54,43,0.18)" : undefined,
              zIndex: dragging ? 2 : undefined,
              transition: dragging ? "none" : "transform 0.15s ease",
            }}
          >
            {canDrag && (
              <button
                type="button"
                aria-label={`${group.name} 순서 바꾸기 (끌어서 옮기기)`}
                onPointerDown={(e) => onDown(e, index)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="flex h-11 w-9 flex-none cursor-grab items-center justify-center rounded-[10px] active:cursor-grabbing"
                style={{ color: dragging ? "var(--point-deep)" : "rgba(38,54,43,0.35)", touchAction: "none" }}
              >
                <GripIcon />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/illustrations/face-${group.avatar}.png`}
              alt=""
              className="h-10 w-10 flex-none rounded-full"
              style={{ background: "var(--paper)" }}
            />
            <Link href={`/recommend/${group.id}`} className="min-w-0 flex-1">
              <p className="d truncate text-[15px]">{group.name}</p>
              <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                {group.sub}
              </p>
            </Link>
            <GroupRemoveButton groupId={group.id} groupName={group.name} mode={{ kind: "leave-child", childId }} />
          </div>
        );
      })}
    </div>
  );
}
