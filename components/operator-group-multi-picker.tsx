"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 숲지기가 그룹을 여러 개 운영할 때, 숙제·추천도서를 한 번에 여러 그룹에
 * 낼 수 있도록 체크박스로 여러 그룹을 고르는 목록(사용자 요청: "그룹 모두에
 * 추천도서와 숙제 동시에 넣을 수도 있단다. 그룹 선택버튼 넣어서 여러그룹에
 * 동시에 올릴 수 있도록"). 고른 그룹 id들을 콤마로 이어 `?groups=` 쿼리로
 * 넘긴다 -- 하나만 고르면 `?group=` 하나만 쓰는 기존 흐름과 동일하게 동작한다.
 */
export default function OperatorGroupMultiPicker({
  groups,
  basePath,
  verb,
}: {
  groups: { id: string; name: string }[];
  basePath: string;
  verb: string;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function go() {
    if (picked.size === 0) return;
    router.push(`${basePath}?groups=${Array.from(picked).join(",")}`);
  }

  return (
    <div className="flex flex-col">
      {groups.map((group, index) => {
        const checked = picked.has(group.id);
        return (
          <label
            key={group.id}
            className="flex items-center justify-between px-[24px] py-[14px] text-sm"
            style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
          >
            <span className="d">{group.name}</span>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(group.id)}
              className="h-5 w-5"
              style={{ accentColor: "var(--point)" }}
            />
          </label>
        );
      })}
      <div className="px-[24px] pb-[16px] pt-[6px]">
        <button
          type="button"
          disabled={picked.size === 0}
          onClick={go}
          className="d w-full rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          {picked.size > 0 ? `선택한 ${picked.size}개 그룹에 ${verb}` : `그룹을 골라 주세요`}
        </button>
      </div>
    </div>
  );
}
