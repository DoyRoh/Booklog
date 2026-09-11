"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlusIcon } from "@/components/icons/misc-icons";

/**
 * 숲지기 탭(아이들·추천도서·숙제) 상단의 그룹 전환. 처음엔 페이지 본문
 * 맨 위에 스크롤과 함께 흘러가는 타일 줄이었는데, "그룹 전환은 고정상단
 * 이길 바라는거야. 흰색 배경 박스로 해서"라는 사용자 요청으로 상단바
 * (`TopBar`) 바로 아래에 항상 붙어 있는 흰색 배경 고정 바로 바꿨다 --
 * 화면을 아무리 내려도 그룹 전환 줄은 계속 보인다. `TopBar`와 같은
 * `fixed inset-x-0` 패턴을 그대로 재사용한다.
 *
 * 그룹이 하나뿐이면(호출부가 아예 렌더링하지 않음) 이 고정 바 자체가
 * 없으므로, 그 화면들은 원래처럼 본문이 상단바 바로 아래에서 시작한다.
 */
export const OPERATOR_GROUP_TILES_HEIGHT = 74;

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
