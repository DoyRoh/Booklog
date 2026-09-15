"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/icons/misc-icons";

type GroupOption = { id: string; name: string };

// 검색 페이지 상단 -- 검색창 + 그룹·종류·기간 좁히기. 상태는 전부 URL
// 쿼리라서(q/group/type/period) 결과를 눌렀다가 뒤로 와도, 새로고침해도
// 그대로 유지된다.
export default function SearchBar({ groups }: { groups: GroupOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 다른 화면에서 뒤로가기 등으로 q가 바뀌어 돌아오면(예: 검색 결과 →
  // 뒤로가기) 입력창도 같이 맞춘다. URL(서버가 준 초기값)을 신뢰 소스로
  // 다시 동기화하는 것이라 의도적인 setState-in-effect다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(initialQ);
  }, [initialQ]);

  function pushWith(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function onChangeQuery(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushWith({ q: value || null }), 300);
  }

  const groupValue = searchParams.get("group") ?? "";
  const typeValue = searchParams.get("type") ?? "all";
  const periodValue = searchParams.get("period") ?? "all";

  return (
    <div>
      <label
        className="flex items-center gap-2 rounded-[14px] border px-3 py-3"
        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
      >
        <SearchIcon width={18} height={18} style={{ color: "var(--ink-2)" }} />
        <input
          type="search"
          autoFocus
          value={q}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="숙제나 책 찾기 (제목·작가·질문·설명·그룹명)"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
        />
      </label>

      <div className="mt-2.5 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <select
          value={groupValue}
          onChange={(e) => pushWith({ group: e.target.value || null })}
          className="d flex-none rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--rule)", background: "var(--paper)", color: "var(--ink)" }}
          aria-label="그룹으로 좁히기"
        >
          <option value="">전체 그룹</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={typeValue}
          onChange={(e) => pushWith({ type: e.target.value === "all" ? null : e.target.value })}
          className="d flex-none rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--rule)", background: "var(--paper)", color: "var(--ink)" }}
          aria-label="종류로 좁히기"
        >
          <option value="all">숙제·추천도서</option>
          <option value="assignment">숙제만</option>
          <option value="book">추천도서만</option>
        </select>
        <select
          value={periodValue}
          onChange={(e) => pushWith({ period: e.target.value === "all" ? null : e.target.value })}
          className="d flex-none rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--rule)", background: "var(--paper)", color: "var(--ink)" }}
          aria-label="기간으로 좁히기"
        >
          <option value="all">전체 기간</option>
          <option value="current">진행 중만</option>
          <option value="past">완료·지난 자료만</option>
        </select>
      </div>
    </div>
  );
}
