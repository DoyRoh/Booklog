import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { AvatarIllustration } from "@/components/illustration";
import { OPERATOR_GROUP_BAR_HEIGHT } from "@/components/operator-group-bar";
import { operatorGroupsQuery } from "@/lib/operator-groups";
import { pickActiveGroupId } from "@/lib/active-operator-group";

type ChildCard = {
  id: string;
  name: string;
  avatar: "rabbit" | "dog" | "cat" | null;
  readCount: number;
  listCount: number;
  completed: number;
  total: number;
};

type GroupSection = {
  id: string;
  name: string;
  children: ChildCard[];
};

// 숲지기의 "아이들" 탭 -- 그룹 하나를 골라(그룹이 둘 이상일 때만 우측
// 상단 드롭다운으로) 그 그룹의 아이들만 본다. 예전엔 모든 그룹을 세로로
// 쌓아 보여줬는데, 그룹이 하나뿐인 대다수 숲지기에게도 "그룹"이라는
// 개념이 항상 끼어들어 화면이 복잡해 보인다는 지적을 반영했다. 그룹별
// 요약(전체를 훑어보는 용도)은 대시보드가 담당한다.
export default async function TeacherChildrenPage({
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
        <h1 className="d text-xl">아이들</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // 운영 그룹 + 그룹원(아이) + 숙제 + 추천도서 + 우리 그룹에서 남긴 완독
  // 기록을 임베드 한 번으로, 완료 현황은 나란히(예전엔 세 번 순차 왕복).
  type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null };
  type GroupRow = {
    id: string;
    name: string;
    members: { child_id: string | null; status: string; children: ChildRow | null }[] | null;
    assignments: { id: string }[] | null;
    book_lists: { book_list_items: { book_id: string }[] | null }[] | null;
    reading_records: { child_id: string; book_id: string }[] | null;
  };
  const [{ data: groupRows }, { data: completionRows }, { data: userRow }] = await Promise.all([
    operatorGroupsQuery(
      supabase,
      userId,
      "members:group_members(child_id, status, children(id, name, avatar)), assignments(id), book_lists(book_list_items(book_id)), reading_records(child_id, book_id)"
    )
      // 숲지기는 자기 그룹으로 기록된 독서기록만 볼 수 있다(RLS) -- 그래서
      // "우리 그룹의 추천도서를 우리 그룹에서 읽은 것" 기준으로 센다.
      .eq("reading_records.status", "done")
      .overrideTypes<GroupRow[], { merge: false }>(),
    // security_invoker 뷰라 RLS상 내가 볼 수 있는 숙제 행만 온다.
    supabase.from("assignment_completion").select("assignment_id, child_id, completed"),
    supabase.from("users").select("active_operator_group_id").eq("id", userId).single(),
  ]);
  const groups = groupRows ?? [];

  const sections: GroupSection[] = groups.map((group) => {
    const children = (group.members ?? [])
      .filter((row) => row.status === "approved" && row.child_id)
      .map((row) => row.children)
      .filter((c): c is ChildRow => Boolean(c));
    const listBooks = new Set((group.book_lists ?? []).flatMap((l) => (l.book_list_items ?? []).map((i) => i.book_id)));
    const assignmentIds = new Set((group.assignments ?? []).map((a) => a.id));
    // 아이 → 읽은 추천도서 id 집합
    const readByChild = new Map<string, Set<string>>();
    for (const row of group.reading_records ?? []) {
      if (!listBooks.has(row.book_id)) continue;
      const set = readByChild.get(row.child_id) ?? new Set<string>();
      set.add(row.book_id);
      readByChild.set(row.child_id, set);
    }

    return {
      id: group.id,
      name: group.name,
      children: children.map((child) => {
        const byAssignment = new Map<string, boolean>();
        for (const row of completionRows ?? []) {
          if (row.child_id !== child.id || !assignmentIds.has(row.assignment_id)) continue;
          byAssignment.set(row.assignment_id, (byAssignment.get(row.assignment_id) ?? true) && row.completed);
        }
        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          readCount: readByChild.get(child.id)?.size ?? 0,
          listCount: listBooks.size,
          completed: Array.from(byAssignment.values()).filter(Boolean).length,
          total: byAssignment.size,
        };
      }),
    };
  });

  const activeGroupId = pickActiveGroupId(sections, groupParam, userRow?.active_operator_group_id);
  const selected = sections.find((s) => s.id === activeGroupId) ?? null;
  // 그룹이 둘 이상이면 상단바 아래 고정 그룹 전환 바(`OperatorGroupBar`,
  // 루트 레이아웃에서 렌더)가 뜬다 -- 그만큼 본문 위쪽에 빈 공간을 미리
  // 마련해 겹치지 않게 한다. 바 자체는 이 페이지가 그리지 않는다(사용자
  // 지적: "탭을 옮길 때마다 사라졌다 다시 생긴다, 제목처럼 계속 있어야지"
  // -- 페이지마다 그리면 라우트 전환 때 언마운트돼 깜빡였다).
  const showGroupTiles = sections.length > 1 && !!selected;

  return (
    <div
      className="mx-auto max-w-[520px] px-5 pb-10"
      style={{ paddingTop: showGroupTiles ? `${32 + OPERATOR_GROUP_BAR_HEIGHT}px` : "32px" }}
    >
      <h1 className="d text-xl">아이들</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        아이마다 추천도서를 몇 권 읽었는지, 숙제를 몇 개 끝냈는지 볼 수 있어요. 누르면 책별·숙제별로 자세히 보여요.
      </p>

      {!selected ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.
        </p>
      ) : selected.children.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 승인된 아이가 없어요.
        </p>
      ) : (
        <div
          className="mt-6 overflow-hidden rounded-[var(--r)] border"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {selected.children.map((child, index) => (
            <Link
              key={child.id}
              href={`/teacher/children/${child.id}?group=${selected.id}`}
              className="flex items-center gap-3 px-4 py-3"
              style={index > 0 ? { borderTop: "1px solid rgba(38,54,43,0.08)" } : undefined}
            >
              <div
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                style={{ background: "var(--paper)" }}
              >
                <AvatarIllustration avatar={child.avatar} height={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{child.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
                  추천도서 {child.readCount}/{child.listCount}권 읽음 ·{" "}
                  {child.total > 0 ? `숙제 ${child.completed}/${child.total} 완료` : "숙제 없음"}
                </p>
              </div>
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                ›
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
