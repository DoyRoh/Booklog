import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import { searchAll, type PeriodFilter, type TypeFilter } from "@/lib/search";
import SearchBar from "@/components/search-bar";
import SearchResults from "@/components/search-results";

function scopeLabel(groupName: string | null, type: TypeFilter, period: PeriodFilter): string {
  const scope = groupName ? groupName : "전체 그룹";
  const kind = type === "assignment" ? "숙제" : type === "book" ? "추천도서" : "숙제와 추천도서";
  const range = period === "current" ? "진행 중인 자료만" : period === "past" ? "완료·지난 자료만" : "완료 및 지난 자료 포함";
  return `${scope} · ${kind} · ${range}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; type?: string; period?: string }>;
}) {
  const { q, group, type, period } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
        <h1 className="d text-xl">검색</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);
  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-[20px]">
        <h1 className="d text-xl">검색</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 숙제·추천도서를 검색할 수 있어요. 위쪽 프로필에서 아이를 추가해 주세요.
        </p>
      </div>
    );
  }

  const typeFilter: TypeFilter = type === "assignment" || type === "book" ? type : "all";
  const periodFilter: PeriodFilter = period === "current" || period === "past" ? period : "all";
  const query = (q ?? "").trim();

  const { results, groups } = await searchAll(supabase, activeChild.id, query, {
    groupId: group,
    type: typeFilter,
    period: periodFilter,
  });
  const selectedGroupName = group ? (groups.find((g) => g.id === group)?.name ?? null) : null;

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-[20px] pb-[16px]">
      <h1 className="d text-xl">숙제·추천도서 검색</h1>
      <div className="mt-4">
        <SearchBar groups={groups} />
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--ink-2)" }}>
        검색 범위: {scopeLabel(selectedGroupName, typeFilter, periodFilter)}
      </p>

      {query.length === 0 ? (
        <p className="mt-8 text-center text-sm" style={{ color: "var(--ink-2)" }}>
          제목, 작가, 숙제 설명, 질문, 그룹명으로 찾아보세요.
        </p>
      ) : results.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            &ldquo;{query}&rdquo;에 맞는 결과가 없어요.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            {groups.length}개 그룹의 숙제·추천도서·질문·설명을 확인했어요. 검색어를 바꾸거나 그룹·기간을 넓혀 보세요.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <SearchResults results={results} />
        </div>
      )}
    </div>
  );
}
