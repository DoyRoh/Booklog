import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/verified-user";
import { RabbitIcon, DogIcon, CatIcon } from "@/components/icons/avatar-icons";

const AVATAR_ICONS = { rabbit: RabbitIcon, dog: DogIcon, cat: CatIcon } as const;

type ChildCard = {
  id: string;
  name: string;
  avatar: "rabbit" | "dog" | "cat" | null;
  completed: number;
  total: number;
};

type GroupSection = {
  id: string;
  name: string;
  children: ChildCard[];
};

export default async function TeacherChildrenPage() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId();

  if (!userId) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">아이 관리</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  // "교사 계정"이라는 고정된 역할 대신, 실제로 운영진으로 승인된 그룹이
  // 있는지로 판단한다(계정 하나가 아이 프로필과 선생님 프로필을 동시에
  // 가질 수 있음). 그룹이 하나도 없으면 아래 "아직 운영하는 그룹이
  // 없어요" 안내가 그대로 자연스럽게 뜬다.
  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin"])
    .eq("status", "approved");

  type GroupRow = { id: string; name: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));
  const groupIds = groups.map((g) => g.id);

  // 그룹마다 아이 목록/숙제/완료현황을 따로 물어보던 걸(N+1), 그룹 id
  // 목록으로 한 번씩만 물어보고 자바스크립트에서 묶는 방식으로 바꿨다.
  type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null };
  const [{ data: memberRows }, { data: assignmentRows }] = groupIds.length
    ? await Promise.all([
        supabase
          .from("group_members")
          .select("group_id, children(id, name, avatar)")
          .in("group_id", groupIds)
          .eq("status", "approved")
          .not("child_id", "is", null),
        supabase.from("assignments").select("id, group_id").in("group_id", groupIds),
      ])
    : [{ data: [] }, { data: [] }];

  const assignmentIds = (assignmentRows ?? []).map((a) => a.id);
  // 완료 통계를 그룹별로 정확히 나누려면(같은 아이가 여러 그룹에 속해
  // 있을 수 있으므로 child_id만으로 필터링하면 다른 그룹 숙제까지 섞인다)
  // assignment_id → group_id 매핑이 필요하다.
  const groupIdByAssignment = new Map((assignmentRows ?? []).map((a) => [a.id, a.group_id]));
  const { data: completionRows } = assignmentIds.length
    ? await supabase
        .from("assignment_completion")
        .select("assignment_id, child_id, completed")
        .in("assignment_id", assignmentIds)
    : { data: [] };

  const sections: GroupSection[] = groups.map((group) => {
    const children = (memberRows ?? [])
      .filter((row) => row.group_id === group.id)
      .map((row) => row.children as unknown as ChildRow | null)
      .filter((c): c is ChildRow => Boolean(c));

    return {
      id: group.id,
      name: group.name,
      children: children.map((child) => {
        const rows = (completionRows ?? []).filter(
          (row) => row.child_id === child.id && groupIdByAssignment.get(row.assignment_id) === group.id
        );
        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          completed: rows.filter((row) => row.completed).length,
          total: rows.length,
        };
      }),
    };
  });

  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10">
      <h1 className="d text-xl">아이 관리</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        그룹에 속한 아이들과 숙제 완료 현황이에요.
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
                <div className="mt-2 flex flex-col gap-2">
                  {section.children.map((child) => {
                    const AvatarIcon = child.avatar ? AVATAR_ICONS[child.avatar] : null;
                    return (
                      <div
                        key={child.id}
                        className="flex items-center gap-3 rounded-[var(--r)] border p-3"
                        style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                      >
                        <div
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                          style={{ background: "var(--paper)" }}
                        >
                          {AvatarIcon && <AvatarIcon width={20} height={20} />}
                        </div>
                        <p className="flex-1 text-sm">{child.name}</p>
                        <span className="text-xs" style={{ color: "var(--ink-2)" }}>
                          {child.total > 0 ? `완료 ${child.completed}/${child.total}` : "숙제 없음"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
