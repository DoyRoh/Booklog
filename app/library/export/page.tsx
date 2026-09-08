import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { getActiveChild } from "@/lib/active-child";
import PrintButton from "@/components/print-button";
import GroupFilterSelect from "@/components/group-filter-select";

const RATING_LABELS: Record<number, string> = {
  5: "최고예요",
  4: "재밌어요",
  3: "좋아요",
  2: "보통이에요",
  1: "별로예요",
};

// 책장을 "내보내기" -- 다른 앱과의 차별점으로 요청받은 기능. 표지 이미지는
// 카카오 CDN 등 외부 도메인이라 캔버스로 캡처하면 CORS 문제로 이미지가
// 빈 칸으로 나올 위험이 커서(브라우저의 "오염된 캔버스" 제약), 이미지
// 캡처 라이브러리 대신 브라우저 내장 인쇄(₩PDF로 저장/공유 시트로 이어짐)
// 를 쓴다 -- 이미지도 그냥 <img>로 그려지므로 CORS 제약이 없다.
export default async function LibraryExportPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: tagParam } = await searchParams;
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">책장 내보내기</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const activeChild = await getActiveChild(supabase, userId);

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">책장 내보내기</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          아이를 등록하면 책장을 내보낼 수 있어요.
        </p>
      </div>
    );
  }

  const [{ data: records }, { data: tagRows }] = await Promise.all([
    supabase
      .from("reading_records")
      .select("book_id, rating, read_date, shelf_tag_id, groups(name), books(title, author, cover_url), shelf_tags(name)")
      .eq("child_id", activeChild.id)
      .eq("status", "done")
      .order("read_date", { ascending: false }),
    supabase.from("shelf_tags").select("id, name").eq("child_id", activeChild.id).order("name"),
  ]);

  type Row = {
    book_id: string;
    rating: number | null;
    read_date: string;
    shelf_tag_id: string | null;
    groups: { name: string } | null;
    books: { title: string; author: string | null; cover_url: string | null } | null;
    shelf_tags: { name: string } | null;
  };
  const allRows = (records ?? []) as unknown as Row[];
  const rows = tagParam ? allRows.filter((r) => r.shelf_tag_id === tagParam) : allRows;
  const tags = tagRows ?? [];
  const selectedTagName = tagParam ? tags.find((t) => t.id === tagParam)?.name ?? null : null;

  const totalRecords = rows.length;
  const uniqueBooks = new Set(rows.map((r) => r.book_id)).size;
  const thisMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthCount = rows.filter((r) => r.read_date.startsWith(thisMonthPrefix)).length;
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-[640px] px-5 pt-8 pb-16">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href="/library" className="text-sm" style={{ color: "var(--point)" }}>
          ← 책장으로
        </Link>
        <PrintButton />
      </div>

      <div className="mt-6 flex items-baseline justify-between border-b pb-4" style={{ borderColor: "var(--rule)" }}>
        <div>
          <p className="d text-xl">
            {activeChild.name}의 {selectedTagName ? `${selectedTagName} ` : ""}책숲 독서 리포트
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
            {today} 기준
          </p>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="no-print mt-4">
          <GroupFilterSelect
            groups={tags}
            selectedId={tagParam ?? null}
            basePath="/library/export"
            queryKey="tag"
            allLabel="전체 책장"
          />
        </div>
      )}

      <div className="mt-5 flex justify-between gap-4 rounded-[var(--r)] border p-4" style={{ borderColor: "var(--rule)" }}>
        <div>
          <p className="d text-2xl">{uniqueBooks}</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            읽은 책(권)
          </p>
        </div>
        <div>
          <p className="d text-2xl">{totalRecords}</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            총 기록(회)
          </p>
        </div>
        <div>
          <p className="d text-2xl">{thisMonthCount}</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            이번 달
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: "var(--ink-2)" }}>
          {tagParam ? "이 이름표가 붙은 책이 아직 없어요." : "아직 다 읽은 책이 없어요."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--r)] border" style={{ borderColor: "var(--rule)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ background: "var(--paper)" }}>
                <th className="px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                  #
                </th>
                <th className="px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                  제목
                </th>
                <th className="px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                  저자
                </th>
                <th className="px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                  읽은 날
                </th>
                <th className="px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                  평가
                </th>
                <th className="px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                  출처
                </th>
                <th className="px-3 py-2 font-normal" style={{ color: "var(--ink-2)" }}>
                  이름표
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.book_id}-${row.read_date}-${i}`} style={{ borderTop: "1px solid var(--rule)" }}>
                  <td className="px-3 py-2" style={{ color: "var(--ink-2)" }}>
                    {rows.length - i}
                  </td>
                  <td className="px-3 py-2">{row.books?.title ?? "(제목 없음)"}</td>
                  <td className="px-3 py-2" style={{ color: "var(--ink-2)" }}>
                    {row.books?.author ?? "-"}
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--ink-2)" }}>
                    {row.read_date}
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--ink-2)" }}>
                    {row.rating ? RATING_LABELS[row.rating] : "-"}
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--ink-2)" }}>
                    {row.groups?.name ?? "직접 기록"}
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--ink-2)" }}>
                    {row.shelf_tags?.name ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
