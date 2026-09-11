"use client";

import { useRouter } from "next/navigation";

/**
 * 숲지기 탭(아이들·추천도서·숙제) 우측 상단의 그룹 선택 드롭다운. 그룹이
 * 하나뿐이면 호출부가 아예 렌더링하지 않는다 -- 고를 게 없는데 드롭다운을
 * 보여주는 건 첫 그룹 하나만 운영하는(가장 흔한) 숲지기에게 불필요한
 * 장식이라는 지적("다 그룹까지 껴있어서 정신 사나워") 반영. 그룹이 둘
 * 이상일 때만 여기서 하나를 골라, 그 아래 탭 내용 전체가 그 그룹
 * 하나만 보여주는 화면으로 좁아진다.
 */
export default function GroupTopSelect({
  groups,
  selectedId,
  basePath,
}: {
  groups: { id: string; name: string }[];
  selectedId: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`${basePath}?group=${e.target.value}`)}
      className="d flex-none rounded-full border px-3 py-1.5 text-xs outline-none"
      style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink)", maxWidth: "150px" }}
    >
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}
