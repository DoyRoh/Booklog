import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import ManagedLogList from "@/components/managed-log-list";
import { loadOperatorBookSections, operatorBookRows } from "@/lib/operator-books";

// 그룹마다 최근 올린 책 몇 권만 미리 보여주고, 전체 목록·선택·삭제는
// 그룹별 관리 화면(/teacher/books/manage?group=)에서 한다.
const PREVIEW_LIMIT = 10;

// 숲지기의 "추천도서" 탭 -- 그룹별 미리보기. 추천도서 한 권당 한 줄:
// 우리 아이들 중 몇 명이 읽었는지 + 지금 숙제에 들어 있는지. 누르면 그
// 책을 누가 어디까지 읽었는지(/teacher/books/[bookId]?group=...).
export default async function TeacherBooksPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">추천도서</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const sections = await loadOperatorBookSections(supabase, userId);

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="d text-xl">추천도서</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            그룹마다 책 서랍이 하나씩 있어요. 최근 {PREVIEW_LIMIT}권만 보이고, ‘관리’에서 전부 보고 고쳐요.
          </p>
        </div>
        {/* 숙제 탭의 "+ 숙제 만들기"와 짝을 맞춘다 -- 이 버튼은 책을 올리는
            동작이고, 새 그룹을 만드는 건 대시보드의 점선 버튼으로 옮겼다
            (같은 버튼이 "새 그룹"과 "책 올리기" 둘 다를 뜻해 헷갈린다는 지적). */}
        {sections.length > 0 && (
          <Link
            href="/teacher/books/add"
            className="d flex-none rounded-[14px] px-3 py-2 text-sm text-white"
            style={{ background: "var(--point)" }}
          >
            + 추천도서 만들기
          </Link>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            아직 운영하는 그룹이 없어요.
          </p>
          <Link href="/recommend/create" className="d mt-2 inline-block text-sm" style={{ color: "var(--point)" }}>
            + 그룹 만들기
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {sections.map((section) => (
            <ManagedLogList
              key={section.id}
              heading={section.name}
              headingSub={`${section.books.length}권`}
              addHref={`/teacher/books/add?group=${section.id}`}
              addLabel="+ 책 추가"
              rows={operatorBookRows(section, section.books.slice(0, PREVIEW_LIMIT))}
              emptyText="아직 추천도서가 없어요. ‘관리’에서 책을 올려 주세요."
              table="book_list_items"
              deleteNoun="추천도서에서 뺄까요? (아이들의 기록은 남아요)"
              preview={{ href: `/teacher/books/manage?group=${section.id}`, total: section.books.length }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
