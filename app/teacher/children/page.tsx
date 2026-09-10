import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { AvatarIllustration } from "@/components/illustration";

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

// 숲지기의 "아이들" 탭 -- 그룹별로 아이 한 명당 한 줄: 추천도서 몇 권을
// 읽었는지 + 숙제 몇 개를 끝냈는지. 줄을 누르면 그 아이의 책별·숙제별
// 상세(/teacher/children/[childId]?group=...)로 간다.
export default async function TeacherChildrenPage() {
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

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin", "curator"])
    .eq("status", "approved");

  type GroupRow = { id: string; name: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const groupIds = groups.map((g) => g.id);

  // 그룹 id 목록으로 한 번씩만 물어보고 자바스크립트에서 묶는다(N+1 회피).
  type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null };
  const [{ data: memberRows }, { data: assignmentRows }, { data: listRows }, { data: doneRows }, { data: completionRows }] =
    groupIds.length
    ? await Promise.all([
        supabase
          .from("group_members")
          .select("group_id, children(id, name, avatar)")
          .in("group_id", groupIds)
          .eq("status", "approved")
          .not("child_id", "is", null),
        supabase.from("assignments").select("id, group_id").in("group_id", groupIds),
        supabase.from("book_lists").select("group_id, book_list_items(book_id)").in("group_id", groupIds),
        // 숲지기는 자기 그룹으로 기록된 독서기록만 볼 수 있다(RLS) -- 그래서
        // "우리 그룹의 추천도서를 우리 그룹에서 읽은 것" 기준으로 센다.
        supabase
          .from("reading_records")
          .select("child_id, book_id, group_id")
          .in("group_id", groupIds)
          .eq("status", "done"),
        // 완료 현황(assignment_completion)은 security_invoker 뷰라 RLS상 내가
        // 볼 수 있는 숙제 행만 온다 -- 숙제 id를 기다렸다가 한 번 더 왕복하지
        // 않고 여기서 같이 가져온 뒤 자기 숙제 id로만 찾아 쓴다.
        supabase.from("assignment_completion").select("assignment_id, child_id, completed"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const listBooksByGroup = new Map<string, Set<string>>();
  for (const row of listRows ?? []) {
    const items = (row.book_list_items as unknown as { book_id: string }[] | null) ?? [];
    const set = listBooksByGroup.get(row.group_id) ?? new Set<string>();
    for (const item of items) set.add(item.book_id);
    listBooksByGroup.set(row.group_id, set);
  }
  // (그룹, 아이) → 읽은 추천도서 id 집합
  const readByGroupChild = new Map<string, Set<string>>();
  for (const row of doneRows ?? []) {
    if (!row.group_id || !listBooksByGroup.get(row.group_id)?.has(row.book_id)) continue;
    const key = `${row.group_id}:${row.child_id}`;
    const set = readByGroupChild.get(key) ?? new Set<string>();
    set.add(row.book_id);
    readByGroupChild.set(key, set);
  }

  // 완료 통계를 그룹별로 정확히 나누려면(같은 아이가 여러 그룹에 속할 수
  // 있음) assignment_id → group_id 매핑이 필요하다. 이 매핑에 없는 숙제의
  // completion 행(예: 같은 계정의 아이가 다른 그룹에서 받은 숙제)은 아래에서
  // 걸러진다.
  const groupIdByAssignment = new Map((assignmentRows ?? []).map((a) => [a.id, a.group_id]));

  // 숙제 하나에 책이 여러 권이면 completion 행도 책 수만큼이라, 숙제 단위로
  // "전부 완료했는지"를 다시 묶는다.
  const sections: GroupSection[] = groups.map((group) => {
    const children = (memberRows ?? [])
      .filter((row) => row.group_id === group.id)
      .map((row) => row.children as unknown as ChildRow | null)
      .filter((c): c is ChildRow => Boolean(c));
    const listCount = listBooksByGroup.get(group.id)?.size ?? 0;

    return {
      id: group.id,
      name: group.name,
      children: children.map((child) => {
        const byAssignment = new Map<string, boolean>();
        for (const row of completionRows ?? []) {
          if (row.child_id !== child.id || groupIdByAssignment.get(row.assignment_id) !== group.id) continue;
          byAssignment.set(row.assignment_id, (byAssignment.get(row.assignment_id) ?? true) && row.completed);
        }
        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          readCount: readByGroupChild.get(`${group.id}:${child.id}`)?.size ?? 0,
          listCount,
          completed: Array.from(byAssignment.values()).filter(Boolean).length,
          total: byAssignment.size,
        };
      }),
    };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <h1 className="d text-xl">아이들</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        아이마다 추천도서를 몇 권 읽었는지, 숙제를 몇 개 끝냈는지 볼 수 있어요. 누르면 책별·숙제별로 자세히 보여요.
      </p>

      {sections.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-2)" }}>
          아직 운영하는 그룹이 없어요.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center justify-between">
                <p className="d text-sm">{section.name}</p>
                <Link href={`/recommend/${section.id}`} className="text-xs" style={{ color: "var(--point)" }}>
                  그룹 관리
                </Link>
              </div>

              {section.children.length === 0 ? (
                <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  아직 승인된 아이가 없어요.
                </p>
              ) : (
                <div
                  className="mt-2 overflow-hidden rounded-[var(--r)] border"
                  style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                >
                  {section.children.map((child, index) => (
                    <Link
                      key={child.id}
                      href={`/teacher/children/${child.id}?group=${section.id}`}
                      className="flex items-center gap-3 px-3 py-3"
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
          ))}
        </div>
      )}
    </div>
  );
}
