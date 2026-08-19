import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">아이 관리</h1>
        <Link href="/login" className="mt-4 block text-sm" style={{ color: "var(--point)" }}>
          로그인하기
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (profile?.role !== "teacher") {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-8">
        <h1 className="d text-xl">아이 관리</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          교사 계정에서만 볼 수 있는 화면이에요.
        </p>
      </div>
    );
  }

  const { data: operatorRows } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", user.id)
    .eq("role", "teacher")
    .eq("status", "approved");

  type GroupRow = { id: string; name: string };
  const groups = (operatorRows ?? [])
    .map((row) => row.groups as unknown as GroupRow | null)
    .filter((g): g is GroupRow => Boolean(g));

  const sections: GroupSection[] = [];
  for (const group of groups) {
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("children(id, name, avatar)")
      .eq("group_id", group.id)
      .eq("status", "approved")
      .not("child_id", "is", null);

    type ChildRow = { id: string; name: string; avatar: "rabbit" | "dog" | "cat" | null };
    const children = (memberRows ?? [])
      .map((row) => row.children as unknown as ChildRow | null)
      .filter((c): c is ChildRow => Boolean(c));

    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select("id")
      .eq("group_id", group.id);
    const assignmentIds = (assignmentRows ?? []).map((a) => a.id);

    const { data: completionRows } = assignmentIds.length
      ? await supabase
          .from("assignment_completion")
          .select("child_id, completed")
          .in("assignment_id", assignmentIds)
      : { data: [] };

    sections.push({
      id: group.id,
      name: group.name,
      children: children.map((child) => {
        const rows = (completionRows ?? []).filter((row) => row.child_id === child.id);
        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          completed: rows.filter((row) => row.completed).length,
          total: rows.length,
        };
      }),
    });
  }

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
