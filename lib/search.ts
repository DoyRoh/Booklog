import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveRange, isPast } from "@/lib/assignment-period";

// "핵심 기능"으로 요청받은 전체 검색 -- 가입한 모든 그룹의 숙제·추천도서·
// 질문·책 정보·그룹명을 한 번에 찾는다. RLS(group_members 승인 여부)가
// 이미 "이 아이가 볼 수 있는 것"만 걸러 주므로, 그룹 id만 좁혀서 조회하면
// 별도 권한 체크 없이도 "열람 권한을 가진 전체 데이터"가 된다.
//
// 지금은 정확한 단어 검색(공백으로 나눈 단어 전부가, 한 필드 안에 단어
// 경계로 등장)만 구현한다 -- 자모 분해 등 형태소 검색은 다음 단계.

export type SearchKind = "assignment" | "question" | "book" | "group";
export type TypeFilter = "all" | "assignment" | "book";
export type PeriodFilter = "all" | "current" | "past";

export type SearchResult = {
  kind: SearchKind;
  /** 결과 화면에 보여줄 종류 라벨(숙제/설명/질문/추천도서/추천 설명/그룹). */
  label: string;
  id: string;
  title: string;
  subtitle: string | null;
  groupId: string;
  groupName: string;
  date: string | null;
  snippet: string;
  coverUrl: string | null;
  href: string;
};

function isWordChar(c: string): boolean {
  return /[\p{L}\p{N}_]/u.test(c);
}

/** haystack 안에 word가 "단어 경계"로(앞뒤가 글자/숫자가 아님) 등장하는지. */
function hasWord(haystack: string, word: string): boolean {
  const hay = haystack.toLowerCase();
  const w = word.toLowerCase();
  if (!w) return true;
  let from = 0;
  for (;;) {
    const i = hay.indexOf(w, from);
    if (i === -1) return false;
    const before = i === 0 ? "" : hay[i - 1];
    const after = i + w.length >= hay.length ? "" : hay[i + w.length];
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = i + 1;
  }
}

/** 질의의 모든 단어가 이 필드 하나 안에 단어 경계로 전부 있어야 매치. */
function fieldMatches(field: string | null | undefined, words: string[]): boolean {
  if (!field || words.length === 0) return false;
  return words.every((w) => hasWord(field, w));
}

/** 매치된 단어 주변 ~50자를 잘라 보여준다(길면 앞뒤에 …). */
function snippetOf(field: string, words: string[]): string {
  const lower = field.toLowerCase();
  const firstWord = words.find((w) => w && lower.includes(w.toLowerCase())) ?? words[0] ?? "";
  const idx = firstWord ? lower.indexOf(firstWord.toLowerCase()) : -1;
  if (field.length <= 70 || idx === -1) return field;
  const start = Math.max(0, idx - 25);
  const end = Math.min(field.length, idx + firstWord.length + 40);
  return `${start > 0 ? "…" : ""}${field.slice(start, end)}${end < field.length ? "…" : ""}`;
}

type AssignmentBookRow = {
  books: { id: string; title: string; author: string | null; cover_url: string | null } | null;
};
type MissionRow = { id: string; type: string; question: string | null };
type AssignmentRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  groups: { name: string } | null;
  assignment_books: AssignmentBookRow[];
  assignment_missions: MissionRow[];
};
type RecommendBookRow = {
  id: string;
  created_at: string;
  books: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    introduction: string | null;
    summary: string | null;
  } | null;
};

export async function searchAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  childId: string,
  query: string,
  filters: { groupId?: string; type?: TypeFilter; period?: PeriodFilter } = {}
): Promise<{ results: SearchResult[]; groups: { id: string; name: string }[] }> {
  const words = query.trim().split(/\s+/).filter(Boolean);

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("child_id", childId)
    .eq("status", "approved");
  const groups = ((memberRows ?? []) as unknown as { groups: { id: string; name: string } | null }[])
    .map((r) => r.groups)
    .filter((g): g is { id: string; name: string } => Boolean(g))
    .filter((g, i, arr) => arr.findIndex((o) => o.id === g.id) === i);
  const groupNameById = new Map(groups.map((g) => [g.id, g.name] as const));
  let groupIds = groups.map((g) => g.id);
  if (filters.groupId) groupIds = groupIds.filter((id) => id === filters.groupId);

  if (groupIds.length === 0 || words.length === 0) return { results: [], groups };

  const results: SearchResult[] = [];
  const typeFilter = filters.type ?? "all";
  const periodFilter = filters.period ?? "all";

  // ── 숙제(제목·설명·질문·숙제 안의 책) ──────────────────────────────
  if (typeFilter !== "book") {
    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select(
        "id, group_id, title, description, start_date, end_date, created_at, groups(name), assignment_books(books(id, title, author, cover_url)), assignment_missions(id, type, question)"
      )
      .in("group_id", groupIds);

    for (const row of (assignmentRows ?? []) as unknown as AssignmentRow[]) {
      const period = { startDate: row.start_date, endDate: row.end_date, createdAt: row.created_at };
      if (periodFilter === "current" && isPast(period)) continue;
      if (periodFilter === "past" && !isPast(period)) continue;

      const groupName = row.groups?.name ?? groupNameById.get(row.group_id) ?? "";
      const cover = row.assignment_books.find((ab) => ab.books?.cover_url)?.books?.cover_url ?? null;
      const dueEnd = effectiveRange(period).end;
      const href = `/group?tab=assignments&group=${encodeURIComponent(row.group_id)}#${row.id}`;

      if (fieldMatches(row.title, words)) {
        results.push({
          kind: "assignment",
          label: "숙제",
          id: `a-title-${row.id}`,
          title: row.title,
          subtitle: groupName,
          groupId: row.group_id,
          groupName,
          date: dueEnd,
          snippet: snippetOf(row.title, words),
          coverUrl: cover,
          href,
        });
      }
      if (fieldMatches(row.description, words)) {
        results.push({
          kind: "assignment",
          label: "숙제 설명",
          id: `a-desc-${row.id}`,
          title: row.title,
          subtitle: groupName,
          groupId: row.group_id,
          groupName,
          date: dueEnd,
          snippet: snippetOf(row.description ?? "", words),
          coverUrl: cover,
          href,
        });
      }
      for (const ab of row.assignment_books) {
        const book = ab.books;
        if (!book) continue;
        if (fieldMatches(book.title, words) || fieldMatches(book.author, words)) {
          results.push({
            kind: "book",
            label: "숙제 책",
            id: `a-book-${row.id}-${book.id}`,
            title: book.title,
            subtitle: book.author ?? row.title,
            groupId: row.group_id,
            groupName,
            date: dueEnd,
            snippet: fieldMatches(book.title, words) ? snippetOf(book.title, words) : snippetOf(book.author ?? "", words),
            coverUrl: book.cover_url,
            href,
          });
        }
      }
      for (const mission of row.assignment_missions) {
        if (mission.type !== "question" || !fieldMatches(mission.question, words)) continue;
        results.push({
          kind: "question",
          label: "질문",
          id: `a-mission-${mission.id}`,
          title: row.title,
          subtitle: groupName,
          groupId: row.group_id,
          groupName,
          date: dueEnd,
          snippet: snippetOf(mission.question ?? "", words),
          coverUrl: cover,
          href: `/group?tab=assignments&group=${encodeURIComponent(row.group_id)}#mission-${mission.id}`,
        });
      }
      if (fieldMatches(groupName, words)) {
        results.push({
          kind: "group",
          label: "그룹",
          id: `g-a-${row.group_id}`,
          title: groupName,
          subtitle: null,
          groupId: row.group_id,
          groupName,
          date: null,
          snippet: groupName,
          coverUrl: null,
          href: `/group?tab=assignments&group=${encodeURIComponent(row.group_id)}`,
        });
      }
    }
  }

  // ── 추천도서(책 제목·작가·소개, 그룹명) ────────────────────────────
  if (typeFilter !== "assignment" && periodFilter !== "past") {
    const { data: bookLists } = await supabase
      .from("book_lists")
      .select("group_id, book_list_items(id, created_at, books(id, title, author, cover_url, introduction, summary))")
      .in("group_id", groupIds);

    for (const list of (bookLists ?? []) as unknown as { group_id: string; book_list_items: RecommendBookRow[] }[]) {
      const groupName = groupNameById.get(list.group_id) ?? "";
      for (const item of list.book_list_items) {
        const book = item.books;
        if (!book) continue;
        const href = `/group?tab=books&group=${encodeURIComponent(list.group_id)}#book-${item.id}`;
        if (fieldMatches(book.title, words) || fieldMatches(book.author, words)) {
          results.push({
            kind: "book",
            label: "추천도서",
            id: `r-book-${item.id}`,
            title: book.title,
            subtitle: book.author,
            groupId: list.group_id,
            groupName,
            date: item.created_at,
            snippet: fieldMatches(book.title, words) ? snippetOf(book.title, words) : snippetOf(book.author ?? "", words),
            coverUrl: book.cover_url,
            href,
          });
        }
        const desc = book.introduction || book.summary || "";
        if (fieldMatches(desc, words)) {
          results.push({
            kind: "book",
            label: "추천 설명",
            id: `r-desc-${item.id}`,
            title: book.title,
            subtitle: book.author,
            groupId: list.group_id,
            groupName,
            date: item.created_at,
            snippet: snippetOf(desc, words),
            coverUrl: book.cover_url,
            href,
          });
        }
      }
      if (fieldMatches(groupName, words) && !results.some((r) => r.kind === "group" && r.groupId === list.group_id)) {
        results.push({
          kind: "group",
          label: "그룹",
          id: `g-b-${list.group_id}`,
          title: groupName,
          subtitle: null,
          groupId: list.group_id,
          groupName,
          date: null,
          snippet: groupName,
          coverUrl: null,
          href: `/group?tab=books&group=${encodeURIComponent(list.group_id)}`,
        });
      }
    }
  }

  // 최신순(날짜 없는 그룹 매치는 맨 뒤).
  results.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return { results, groups };
}
