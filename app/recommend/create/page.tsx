"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type GroupType = "kindergarten" | "school" | "library" | "family" | "community" | "creator";
type JoinPolicy = "approval" | "open";
type OperatorRole = "teacher" | "curator";

const OPERATOR_ROLES: { value: OperatorRole; label: string; description: string }[] = [
  { value: "teacher", label: "선생님", description: "학급 추천도서·숙제를 관리해요" },
  { value: "curator", label: "기관·인플루언서", description: "승인 없이 팔로우 가능한 추천도서를 발행해요" },
];

const TYPES: { value: GroupType; label: string }[] = [
  { value: "kindergarten", label: "유치원" },
  { value: "school", label: "학교" },
  { value: "library", label: "도서관" },
  { value: "family", label: "가족" },
  { value: "community", label: "커뮤니티" },
  { value: "creator", label: "크리에이터" },
];

function randomInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("school");
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>("approval");
  const [operatorRole, setOperatorRole] = useState<OperatorRole>("teacher");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인 정보를 확인할 수 없어요.");
      setSaving(false);
      return;
    }

    const groupId = crypto.randomUUID();
    const { error: groupError } = await supabase.from("groups").insert({
      id: groupId,
      name: name.trim(),
      type,
      join_policy: joinPolicy,
      owner_id: user.id,
      invite_code: randomInviteCode(),
    });
    if (groupError) {
      setError(groupError.message);
      setSaving(false);
      return;
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: operatorRole,
      status: "approved",
      approved_at: new Date().toISOString(),
    });
    if (memberError) {
      setError(memberError.message);
      setSaving(false);
      return;
    }

    const { error: listError } = await supabase.from("book_lists").insert({
      group_id: groupId,
      name: "추천도서",
    });
    if (listError) {
      setError(listError.message);
      setSaving(false);
      return;
    }

    // 이 그룹을 만든 사람은 곧 그 그룹의 운영진 프로필이 생긴 것이므로,
    // 바로 그 프로필로 전환해서 하단 탭이 방금 만든 그룹의 대시보드를
    // 보여주도록 한다(계정에 아이 프로필이 이미 있어도 그대로 유지되고,
    // 더보기에서 언제든 다시 아이 프로필로 돌아올 수 있다).
    await supabase.from("users").update({ active_profile_type: "operator" }).eq("id", user.id);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));

    router.replace(`/recommend/${groupId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col px-6 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="d text-xl">그룹 만들기</h1>
        <Link href="/recommend" className="text-sm" style={{ color: "var(--ink-2)" }}>
          닫기
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <div>
          <p className="d text-sm">이 그룹을 운영할 나는</p>
          <div className="mt-2 flex flex-col gap-2">
            {OPERATOR_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setOperatorRole(r.value)}
                className="rounded-[var(--r)] border px-4 py-3 text-left"
                style={{
                  borderColor: operatorRole === r.value ? "var(--point)" : "var(--rule)",
                  background: operatorRole === r.value ? "rgba(47,168,79,0.08)" : "var(--card)",
                }}
              >
                <p className="d text-sm">{r.label}</p>
                <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                  {r.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="그룹 이름 (예: 7세 은빛반)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-[14px] border px-4 py-3 text-sm outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />

        <div>
          <p className="d text-sm">유형</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="d rounded-full border px-3 py-1.5 text-sm"
                style={{
                  borderColor: type === t.value ? "var(--point)" : "var(--rule)",
                  background: type === t.value ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: type === t.value ? "var(--point-deep)" : "var(--ink)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="d text-sm">가입 방식</p>
          <div className="mt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setJoinPolicy("approval")}
              className="rounded-[var(--r)] border px-4 py-3 text-left"
              style={{
                borderColor: joinPolicy === "approval" ? "var(--point)" : "var(--rule)",
                background: joinPolicy === "approval" ? "rgba(47,168,79,0.08)" : "var(--card)",
              }}
            >
              <p className="d text-sm">승인제</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                초대 코드로 신청받고 직접 승인해요. 학급형 그룹에 적합해요.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setJoinPolicy("open")}
              className="rounded-[var(--r)] border px-4 py-3 text-left"
              style={{
                borderColor: joinPolicy === "open" ? "var(--point)" : "var(--rule)",
                background: joinPolicy === "open" ? "rgba(47,168,79,0.08)" : "var(--card)",
              }}
            >
              <p className="d text-sm">공개</p>
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                누구나 승인 없이 바로 팔로우할 수 있어요. 기관·크리에이터에 적합해요.
              </p>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--berry)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!name.trim() || saving}
          onClick={create}
          className="d rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          {saving ? "만드는 중..." : "그룹 만들기"}
        </button>
      </div>
    </div>
  );
}
