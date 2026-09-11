"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlusIcon } from "@/components/icons/misc-icons";

/**
 * 숲지기 탭(아이들·추천도서·숙제) 상단의 그룹 전환 -- 부모 쪽 숲길/숙제
 * 탭의 `GroupTiles`(둥근 네모 타일 가로 스크롤)와 같은 모양으로 통일한다
 * (사용자 요청: "고정 상단 박스형으로 이런식으로 그룹 전환이 되게").
 * 다만 여기는 그룹 하나만 보여주는 화면이 이미 확정된 다음이라 "전체"
 * 타일은 없고, 타일 크기도 부모 쪽(56px)보다 작게(40px) 줄였다.
 *
 * 고른 그룹은 `users.active_operator_group_id`에 저장돼(부모 쪽
 * active_child_id와 같은 패턴) 아이들/추천도서/숙제 세 탭이 공유한다 --
 * 어느 탭에서 바꾸든 다른 탭에도 그대로 이어진다.
 */
export default function OperatorGroupTiles({
  groups,
  selectedId,
  basePath,
}: {
  groups: { id: string; name: string }[];
  selectedId: string;
  basePath: string;
}) {
  const router = useRouter();

  async function pick(id: string) {
    router.push(`${basePath}?group=${id}`);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("users").update({ active_operator_group_id: id }).eq("id", session.user.id);
    }
  }

  return (
    <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pt-1 pb-1" style={{ scrollbarWidth: "none" }}>
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
                background: active ? "var(--point-deep)" : "var(--card)",
                color: active ? "#fff" : "var(--ink)",
                border: active ? "1px solid var(--point-deep)" : "1px solid var(--rule)",
                boxShadow: active ? "0 3px 8px rgba(27,94,58,0.28)" : "0 1px 3px rgba(38,54,43,0.08)",
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
  );
}
