"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { randomInviteCode } from "@/lib/invite-code";

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

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("school");
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>("approval");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  async function create() {
    // state로만 막으면 리렌더 전 짧은 틈에 두 번 눌려 그룹이 두 개
    // 생길 수 있다(library/add·팔로우 버튼과 같은 가드).
    if (!name.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await createGroup();
    } finally {
      savingRef.current = false;
    }
  }

  async function createGroup() {

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
      // 선생님/기관/인플루언서 구분 없이 전부 "숲지기"라 그룹을 만든 사람은
      // 항상 같은 운영 역할로 들어간다(DB의 역할 값은 예전 이름 그대로).
      role: "teacher",
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
