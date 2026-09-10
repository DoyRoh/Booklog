import Link from "next/link";
import { PlusIcon } from "@/components/icons/misc-icons";

export type GroupTile = {
  id: string;
  name: string;
  /** 최근 일주일 새로 올라온 추천도서 수 -- 0이면 배지 없음. */
  newCount: number;
};

// 숲길 탭 상단의 그룹 고르기 -- 드롭다운 대신 앱 아이콘처럼 생긴 네모
// 타일을 가로로 늘어놓는다(사용자가 보낸 참고 이미지: 둥근 네모 + 오른쪽
// 위 숫자 배지). 타일마다 그룹 이름 첫 글자, 새로 올라온 책이 있으면
// 베리색 숫자 배지. 마지막 "+" 타일은 다른 그룹 찾기·참가(더보기와 같은
// 목적지). 그룹이 하나뿐이어도 보여서 "여기서 그룹을 오간다"는 게 드러난다.
export default function GroupTiles({
  groups,
  selectedId,
  basePath,
  addHref = "/recommend",
}: {
  groups: GroupTile[];
  selectedId: string;
  basePath: string;
  addHref?: string;
}) {
  return (
    <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: "none" }}>
      {groups.map((group) => {
        const active = group.id === selectedId;
        return (
          <Link
            key={group.id}
            href={`${basePath}?group=${encodeURIComponent(group.id)}`}
            aria-current={active ? "true" : undefined}
            className="flex w-16 flex-none flex-col items-center gap-1.5"
          >
            <span className="relative block">
              <span
                className="d flex h-14 w-14 items-center justify-center rounded-[18px] text-lg"
                style={{
                  background: active ? "var(--point-deep)" : "var(--card)",
                  color: active ? "#fff" : "var(--ink)",
                  border: active ? "1px solid var(--point-deep)" : "1px solid var(--rule)",
                  boxShadow: active ? "0 4px 10px rgba(27,94,58,0.28)" : "0 2px 4px rgba(38,54,43,0.08)",
                }}
              >
                {group.name.trim().charAt(0)}
              </span>
              {group.newCount > 0 && (
                <span
                  className="d absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] text-white"
                  style={{ background: "var(--berry)", boxShadow: "0 0 0 2px var(--paper)" }}
                  aria-label={`새 추천도서 ${group.newCount}권`}
                >
                  {group.newCount > 9 ? "9+" : group.newCount}
                </span>
              )}
            </span>
            <span
              className="w-full truncate text-center text-[11px] leading-tight"
              style={{ color: active ? "var(--point-deep)" : "var(--ink-2)", fontWeight: active ? 600 : 400 }}
            >
              {group.name}
            </span>
          </Link>
        );
      })}

      <Link href={addHref} className="flex w-16 flex-none flex-col items-center gap-1.5" aria-label="다른 그룹 찾기">
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
  );
}
