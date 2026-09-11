"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/profile-context";
import { PlusIcon } from "@/components/icons/misc-icons";

/**
 * '그룹' 탭(추천도서·숙제 소제목 탭을 한 화면에 합친 `/group`) 상단의
 * 그룹 전환. 숲지기 쪽 `OperatorGroupBar`와 같은 이유로 루트 레이아웃에
 * 한 번만 마운트한다 -- 화면을 옮길 때마다 그리면 언마운트돼 깜빡인다.
 * `children.active_group_id`에 저장해 뒀다가, 추천도서/숙제 소제목 탭을
 * 오갈 때도 같은 그룹이 그대로 이어진다("여기저기서 그룹전환하느라
 * 정신없다"는 지적으로, 원래 따로였던 숲길·숙제 탭 자체를 하나로 합치고
 * 그 안의 그룹 선택도 하나로 통일했다).
 *
 * 부모 쪽은 그룹이 하나뿐이어도 "전체" 개념이 있어(숲지기 쪽엔 없음)
 * 타일 목록이 항상 뜬다. 그룹별 "새로 올라온 책 수"/"안 끝난 숙제 수"
 * 배지는 추천도서/숙제 소제목 탭에서 의미가 서로 달라 하나의 공용 바가
 * 어느 쪽 숫자를 보여줘야 할지 애매해지므로 없앴다(숲지기 쪽 그룹 바도
 * 처음부터 배지가 없다 -- 통일).
 */
export const CHILD_GROUP_BAR_HEIGHT = 93;

const GROUP_PATH = "/group";

type GroupOption = { id: string; name: string };

export default function ChildGroupBar() {
  const { role, childId } = useProfile();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupOption[] | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const onTab = pathname === GROUP_PATH;

  useEffect(() => {
    if (role !== "parent" || !onTab || !childId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: groupRows }, { data: childRow }] = await Promise.all([
        supabase.from("group_members").select("groups(id, name)").eq("child_id", childId).eq("status", "approved"),
        supabase.from("children").select("active_group_id").eq("id", childId).single(),
      ]);
      if (cancelled) return;
      const list = ((groupRows as unknown as { groups: GroupOption | null }[] | null) ?? [])
        .map((r) => r.groups)
        .filter((g): g is GroupOption => Boolean(g))
        .filter((g, i, arr) => arr.findIndex((o) => o.id === g.id) === i);
      setGroups(list);
      setActiveGroupId(childRow?.active_group_id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, onTab, childId, pathname]);

  const pick = useCallback(
    async (id: string | null) => {
      setActiveGroupId(id);
      // 추천도서/숙제 중 어느 소제목 탭을 보고 있었는지(tab=)는 그대로
      // 유지한 채 그룹만 바꾼다.
      const tab = searchParams.get("tab");
      const params = new URLSearchParams();
      if (tab) params.set("tab", tab);
      if (id) params.set("group", id);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
      if (childId) {
        const supabase = createClient();
        await supabase.from("children").update({ active_group_id: id }).eq("id", childId);
      }
    },
    [pathname, router, childId, searchParams]
  );

  if (!onTab || role !== "parent" || !groups || groups.length === 0) return null;

  const queryGroup = searchParams.get("group");
  const selectedId =
    (queryGroup && groups.some((g) => g.id === queryGroup) && queryGroup) ||
    (activeGroupId && groups.some((g) => g.id === activeGroupId) && activeGroupId) ||
    "all";

  return (
    <div
      className="no-print fixed inset-x-0 z-40 border-b"
      style={{
        top: "52px",
        background: "var(--card)",
        borderColor: "var(--rule)",
        boxShadow: "0 2px 6px rgba(38,54,43,0.06)",
      }}
    >
      <div className="mx-auto flex max-w-[520px] gap-4 overflow-x-auto px-5 py-2" style={{ scrollbarWidth: "none" }}>
        <button
          type="button"
          onClick={() => pick(null)}
          aria-current={selectedId === "all" ? "true" : undefined}
          className="flex w-16 flex-none flex-col items-center gap-1.5"
        >
          <span
            className="d flex h-14 w-14 items-center justify-center rounded-[18px] text-sm"
            style={{
              background: selectedId === "all" ? "var(--point-deep)" : "var(--paper)",
              color: selectedId === "all" ? "#fff" : "var(--ink)",
              border: selectedId === "all" ? "1px solid var(--point-deep)" : "1px solid var(--rule)",
              boxShadow: selectedId === "all" ? "0 4px 10px rgba(27,94,58,0.28)" : "none",
            }}
          >
            전체
          </span>
          <span
            className="w-full truncate text-center text-[11px] leading-tight"
            style={{ color: selectedId === "all" ? "var(--point-deep)" : "var(--ink-2)", fontWeight: selectedId === "all" ? 600 : 400 }}
          >
            전체
          </span>
        </button>

        {groups.map((group) => {
          const active = group.id === selectedId;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => pick(group.id)}
              aria-current={active ? "true" : undefined}
              className="flex w-16 flex-none flex-col items-center gap-1.5"
            >
              <span
                className="d flex h-14 w-14 items-center justify-center rounded-[18px] text-lg"
                style={{
                  background: active ? "var(--point-deep)" : "var(--paper)",
                  color: active ? "#fff" : "var(--ink)",
                  border: active ? "1px solid var(--point-deep)" : "1px solid var(--rule)",
                  boxShadow: active ? "0 4px 10px rgba(27,94,58,0.28)" : "none",
                }}
              >
                {group.name.trim().charAt(0)}
              </span>
              <span
                className="w-full truncate text-center text-[11px] leading-tight"
                style={{ color: active ? "var(--point-deep)" : "var(--ink-2)", fontWeight: active ? 600 : 400 }}
              >
                {group.name}
              </span>
            </button>
          );
        })}

        <Link href="/recommend" className="flex w-16 flex-none flex-col items-center gap-1.5" aria-label="다른 그룹 찾기">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-dashed"
            style={{ borderColor: "rgba(38,54,43,0.28)", color: "var(--ink-2)" }}
          >
            <PlusIcon width={22} height={22} />
          </span>
          <span className="w-full truncate text-center text-[11px] leading-tight" style={{ color: "var(--ink-2)" }}>
            그룹 찾기
          </span>
        </Link>
      </div>
    </div>
  );
}
