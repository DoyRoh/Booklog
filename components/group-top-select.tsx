"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 숲지기 탭(아이들·추천도서·숙제) 우측 상단의 그룹 선택 드롭다운. 그룹이
 * 하나뿐이면 호출부가 아예 렌더링하지 않는다 -- 고를 게 없는데 드롭다운을
 * 보여주는 건 첫 그룹 하나만 운영하는(가장 흔한) 숲지기에게 불필요한
 * 장식이라는 지적 반영.
 *
 * 여기서 고른 그룹은 `users.active_operator_group_id`에 저장된다(부모
 * 쪽 active_child_id와 같은 패턴) -- "한 탭에서 그룹을 바꿔도 다른
 * 탭으로 가면 다시 첫 그룹으로 돌아간다, 매번 다시 골라야 해서 귀찮다"는
 * 지적을 반영해, 아이들/추천도서/숙제 세 탭이 이 값 하나를 공유한다.
 */
export default function GroupTopSelect({
  groups,
  selectedId,
  basePath,
}: {
  groups: { id: string; name: string }[];
  selectedId: string;
  basePath: string;
}) {
  const router = useRouter();

  async function handleChange(id: string) {
    router.push(`${basePath}?group=${id}`);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("users").update({ active_operator_group_id: id }).eq("id", session.user.id);
    }
  }

  return (
    <select
      value={selectedId}
      onChange={(e) => handleChange(e.target.value)}
      className="d flex-none rounded-full border px-3 py-1.5 text-xs outline-none"
      style={{ borderColor: "var(--rule)", background: "var(--card)", color: "var(--ink)", maxWidth: "150px" }}
    >
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}
