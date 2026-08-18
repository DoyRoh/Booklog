"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type GroupType = "kindergarten" | "school" | "library" | "family" | "community" | "creator";
type JoinPolicy = "approval" | "open";

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

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    const operatorRole = profile?.role === "curator" ? "curator" : "teacher";

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
