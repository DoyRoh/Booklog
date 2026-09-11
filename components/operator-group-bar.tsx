"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { operatorGroupsQuery } from "@/lib/operator-groups";
import { useProfile } from "@/components/profile-context";
import { PlusIcon } from "@/components/icons/misc-icons";

/**
 * 숲지기 탭(아이들·추천도서·숙제) 상단의 그룹 전환. 원래는 각 페이지가
 * 직접 그리는 컴포넌트였는데, 그러면 페이지를 옮길 때마다(각자 다른
 * 라우트라 리액트가 이전 페이지를 통째로 언마운트) 이 바도 같이
 * 사라졌다 다시 나타나며 깜빡였다(사용자 지적: "제목처럼 그 자리에
 * 계속 있어야지"). `TopBar`/`BottomNav`처럼 루트 레이아웃에 한 번만
 * 마운트해서, 그 세 화면 사이를 오가도 이 컴포넌트 자체는 계속 살아
 * 있게 했다 -- 그룹 목록·선택 상태를 여기서 직접 들고 있는다.
 */
export const OPERATOR_GROUP_BAR_HEIGHT = 74;

const TAB_PATHS = ["/teacher/children", "/teacher/books", "/teacher/assignments"];

type GroupOption = { id: string; name: string };

export default function OperatorGroupBar() {
  const { role } = useProfile();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupOption[] | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const onTab = TAB_PATHS.includes(pathname);

  // 그룹 목록은 세 탭 화면에 있을 때만 필요하고, 그룹을 새로 만들고
  // 돌아왔을 수도 있으니 탭에 들어올 때마다 다시 읽는다(가벼운 조회라
  // 매번 불러도 부담이 적고, 그동안 화면엔 이전 목록이 그대로 남아
  // 있어 깜빡이지 않는다).
  useEffect(() => {
    if (role !== "operator" || !onTab) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const [{ data: groupRows }, { data: userRow }] = await Promise.all([
        operatorGroupsQuery(supabase, session.user.id),
        supabase.from("users").select("active_operator_group_id").eq("id", session.user.id).single(),
      ]);
      if (cancelled) return;
      setGroups(((groupRows as { id: string; name: string }[] | null) ?? []).map((g) => ({ id: g.id, name: g.name })));
      setActiveGroupId(userRow?.active_operator_group_id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, onTab, pathname]);

  const pick = useCallback(
    async (id: string) => {
      setActiveGroupId(id);
      router.push(`${pathname}?group=${id}`);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("users").update({ active_operator_group_id: id }).eq("id", session.user.id);
      }
    },
    [pathname, router]
  );

  if (!onTab || role !== "operator" || !groups || groups.length <= 1) return null;

  const queryGroup = searchParams.get("group");
  const selectedId =
    (queryGroup && groups.some((g) => g.id === queryGroup) && queryGroup) ||
    (activeGroupId && groups.some((g) => g.id === activeGroupId) && activeGroupId) ||
    groups[0].id;

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
      <div
        className="mx-auto flex max-w-[520px] gap-3 overflow-x-auto px-5 py-2"
        style={{ scrollbarWidth: "none" }}
      >
        {groups.map((group) => {
          const active = group.id === selectedId;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => pick(group.id)}
              aria-current={active ? "true" : undefined}
              className="flex w-12 flex-none flex-col items-center gap-1"
            >
              <span
                className="d flex h-10 w-10 items-center justify-center rounded-[12px] text-sm"
                style={{
                  background: active ? "var(--point-deep)" : "var(--paper)",
                  color: active ? "#fff" : "var(--ink)",
                  border: active ? "1px solid var(--point-deep)" : "1px solid var(--rule)",
                  boxShadow: active ? "0 3px 8px rgba(27,94,58,0.28)" : "none",
                }}
              >
                {group.name.trim().charAt(0)}
              </span>
              <span
                className="w-full truncate text-center text-[10px] leading-tight"
                style={{ color: active ? "var(--point-deep)" : "var(--ink-2)", fontWeight: active ? 600 : 400 }}
              >
                {group.name}
              </span>
            </button>
          );
        })}

        <Link href="/recommend/create" className="flex w-12 flex-none flex-col items-center gap-1" aria-label="새 그룹 만들기">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-dashed"
            style={{ borderColor: "rgba(38,54,43,0.28)", color: "var(--ink-2)" }}
          >
            <PlusIcon width={18} height={18} />
          </span>
          <span className="w-full truncate text-center text-[10px] leading-tight" style={{ color: "var(--ink-2)" }}>
            새 그룹
          </span>
        </Link>
      </div>
    </div>
  );
}
