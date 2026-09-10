import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import ManagedLogList from "@/components/managed-log-list";
import OperatorGroupPicker from "@/components/operator-group-picker";
import Section from "@/components/section";
import { loadOperatorBookSections, operatorBookRows } from "@/lib/operator-books";

// 그룹 하나의 추천도서 관리 화면 -- 전체 목록, 책 추가, 선택해서 빼기.
// 추천도서 탭은 그룹별 미리보기(최근 10권)만 보여주고 여기로 이어진다.
export default async function ManageGroupBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group: groupParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <Link href="/login" className="text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const sections = await loadOperatorBookSections(supabase, userId);
  const section = sections.find((s) => s.id === groupParam) ?? (sections.length === 1 ? sections[0] : null);

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <Link href="/teacher/books" className="text-sm" style={{ color: "var(--ink-2)" }}>
        ← 추천도서
      </Link>

      {sections.length === 0 ? (
        <>
          <h1 className="d mt-2 text-xl">추천도서 관리</h1>
          <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
            아직 운영하는 그룹이 없어요.{" "}
            <Link href="/recommend/create" style={{ color: "var(--point)" }}>
              그룹 만들기
            </Link>
          </p>
        </>
      ) : !section ? (
        <>
          <h1 className="d mt-2 text-xl">추천도서 관리</h1>
          <Section className="mt-5" title="어느 그룹의 추천도서를 볼까요?" flush>
            <OperatorGroupPicker groups={sections.map((s) => ({ id: s.id, name: s.name }))} basePath="/teacher/books/manage" verb="관리" />
          </Section>
        </>
      ) : (
        <>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="d text-xl">{section.name}</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
                추천도서 {section.books.length}권 · 그룹원 {section.memberCount}명. 오른쪽 ‘선택’으로 여러 권을 한 번에 뺄 수 있어요.
              </p>
            </div>
            <Link href={`/recommend/${section.id}`} className="flex-none text-xs" style={{ color: "var(--ink-2)" }}>
              그룹 설정 ›
            </Link>
          </div>

          <div className="mt-5">
            <ManagedLogList
              heading="추천도서"
              headingSub={`${section.books.length}권`}
              addHref={`/teacher/books/add?group=${section.id}`}
              addLabel="+ 책 추가"
              rows={operatorBookRows(section)}
              emptyText="아직 추천도서가 없어요. 위의 ‘+ 책 추가’로 올려 주세요."
              table="book_list_items"
              deleteNoun="추천도서에서 뺄까요? (아이들의 기록은 남아요)"
            />
          </div>

          {sections.length > 1 && (
            <Section className="mt-5" title="다른 그룹" flush>
              <OperatorGroupPicker
                groups={sections.filter((s) => s.id !== section.id).map((s) => ({ id: s.id, name: s.name }))}
                basePath="/teacher/books/manage"
                verb="관리"
              />
            </Section>
          )}
        </>
      )}
    </div>
  );
}
