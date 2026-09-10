"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setRead, setShelved } from "@/lib/quick-read";
import { BookmarkIcon, CheckCircleIcon } from "@/components/icons/misc-icons";
import type { ReadingStatus } from "@/lib/reading-status";

// 목록 줄 오른쪽의 아이콘 토글. 글자("읽었어요"/"책장에 꽂기"/"읽는 중")
// 대신 체크(읽음)와 책갈피(책장에 있음) 두 개로만 상태를 보여준다.
export function ReadCheck({
  childId,
  bookId,
  groupId,
  done,
  size = 26,
}: {
  childId: string;
  bookId: string;
  groupId: string | null;
  done: boolean;
  size?: number;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const busy = useRef(false);
  const value = optimistic ?? done;

  async function toggle() {
    if (busy.current) return;
    busy.current = true;
    const next = !value;
    setOptimistic(next);
    await setRead(createClient(), childId, bookId, groupId, next);
    busy.current = false;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={value}
      aria-label={value ? "읽었어요 (누르면 해제)" : "읽었어요로 표시"}
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ color: value ? "var(--point)" : "rgba(38,54,43,0.28)" }}
    >
      <CheckCircleIcon filled={value} width={size} height={size} />
    </button>
  );
}

export function ShelfBookmark({
  childId,
  bookId,
  groupId,
  status,
  size = 22,
}: {
  childId: string;
  bookId: string;
  groupId: string | null;
  status: ReadingStatus | null;
  size?: number;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const busy = useRef(false);
  const shelved = optimistic ?? status !== null;
  // 읽는 중/다 읽은 책은 책갈피를 빼도 기록이 남아 있어 의미가 없다 -- 꽂기만.
  const removable = status === "want" || status === null;

  async function toggle() {
    if (busy.current || (shelved && !removable)) return;
    busy.current = true;
    const next = !shelved;
    setOptimistic(next);
    await setShelved(createClient(), childId, bookId, groupId, next);
    busy.current = false;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={shelved}
      aria-label={shelved ? "책장에 있어요" : "책장에 꽂기"}
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ color: shelved ? "var(--lantern)" : "rgba(38,54,43,0.28)" }}
    >
      <BookmarkIcon filled={shelved} width={size} height={size} />
    </button>
  );
}
