"use client";

import { useRouter } from "next/navigation";

export type FilterGroup = { id: string; name: string };

// 숲길 탭 상단의 그룹 드롭다운 -- URL의 ?group= 쿼리로 선택 상태를
// 저장하므로(클라이언트 state가 아니라), 서버 컴포넌트가 선택된 그룹에
// 맞는 추천도서/숙제를 그대로 다시 렌더링할 수 있다.
export default function GroupFilterSelect({
  groups,
  selectedId,
  basePath,
  queryKey = "group",
  allLabel = "전체 그룹",
}: {
  groups: FilterGroup[];
  selectedId: string | null;
  basePath: string;
  queryKey?: string;
  allLabel?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? "all"}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value === "all" ? basePath : `${basePath}?${queryKey}=${value}`);
      }}
      className="d w-full rounded-[14px] border px-4 py-3 text-sm outline-none"
      style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink)" }}
    >
      <option value="all">{allLabel}</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}
