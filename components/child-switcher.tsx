"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarIllustration } from "@/components/illustration";

type Avatar = "rabbit" | "dog" | "cat";
type Child = {
  id: string;
  name: string;
  avatar: Avatar | null;
  birth_date: string | null;
};


const AVATAR_OPTIONS: { value: Avatar; label: string }[] = [
  { value: "rabbit", label: "토끼" },
  { value: "dog", label: "강아지" },
  { value: "cat", label: "고양이" },
];

export default function ChildSwitcher({
  userId,
  childList: initialChildren,
  activeChildId,
}: {
  userId: string;
  childList: Child[];
  activeChildId: string | null;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const activeChild = initialChildren.find((c) => c.id === activeChildId) ?? null;

  function startEditName(child: Child) {
    setEditingId(child.id);
    setNameDraft(child.name);
    setNameError(null);
  }

  // 숲지기 이름 고치기와 같은 패턴 -- 이름을 바꾸면 상단 "OO의 책숲"
  // 제목도 즉시 바뀌어야 하므로 프로필 변경 이벤트를 같이 쏜다.
  async function saveChildName(childId: string) {
    const next = nameDraft.trim();
    if (!next) return;
    setNameSaving(true);
    setNameError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("children").update({ name: next }).eq("id", childId);
    setNameSaving(false);
    if (updateError) {
      setNameError(updateError.message);
      return;
    }
    setEditingId(null);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.refresh();
  }

  async function selectChild(child: Child) {
    const childId = child.id;
    // 이미 고른 아이를 또 누르면 "아무 일도 없음" 대신 그 아이의 오늘 탭으로.
    if (childId === activeChildId) {
      router.push("/today");
      return;
    }
    // 전환은 화면 전체(하단 탭·기록 대상)가 바뀌는 큰 동작이라 한 번 묻는다.
    if (!window.confirm(`${child.name} 프로필로 전환하시겠어요?`)) return;
    setSwitching(childId);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({ active_child_id: childId, active_profile_type: "child" })
      .eq("id", userId);

    setSwitching(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // 상단 "OO의 책숲" 제목은 router.refresh()로는 안 바뀐다(서버 컴포넌트만
    // 다시 그리고, 이 제목은 클라이언트에서 따로 들고 있는 상태라서) --
    // 전역으로 이벤트를 쏴서 즉시 다시 불러오게 한다.
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    // 전환됐다는 게 눈에 보이게 그 아이의 오늘 탭으로 간다(숲지기 → 아이
    // 전환도 이 경로라, 하단 탭이 바뀌는 게 바로 보인다).
    router.push("/today");
    router.refresh();
  }

  async function addChild() {
    if (!name.trim() || !avatar) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const childId = crypto.randomUUID();

    const { error: childError } = await supabase.from("children").insert({
      id: childId,
      name: name.trim(),
      birth_date: birthDate || null,
      avatar,
    });
    if (childError) {
      setError(childError.message);
      setSaving(false);
      return;
    }

    const { error: guardianError } = await supabase.from("child_guardians").insert({
      child_id: childId,
      user_id: userId,
      role: "owner",
    });
    if (guardianError) {
      setError(guardianError.message);
      setSaving(false);
      return;
    }

    // 새로 추가한 아이로 바로 전환.
    const { error: activeError } = await supabase
      .from("users")
      .update({ active_child_id: childId, active_profile_type: "child" })
      .eq("id", userId);
    if (activeError) {
      setError(activeError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setAdding(false);
    setName("");
    setBirthDate("");
    setAvatar(null);
    window.dispatchEvent(new Event("chaeksup:profile-changed"));
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {/* 숲지기 프로필의 "숲지기 이름" 표시와 짝을 맞춘 것 -- 지금 보고 있는
          아이 이름을 목록 위에 파란 형광펜 밑줄로 한 번 더 짚어 준다. */}
      {activeChild && (
        <p className="text-sm">
          선택된 아이 ·{" "}
          <mark
            className="d"
            style={{
              background: "linear-gradient(180deg, transparent 55%, rgba(58,134,255,0.38) 55%)",
              color: "var(--ink)",
              padding: "0 2px",
            }}
          >
            {activeChild.name}
          </mark>
        </p>
      )}
      {initialChildren.map((child) => {
        const active = child.id === activeChildId;
        const editing = editingId === child.id;
        return (
          <div
            key={child.id}
            className="rounded-[var(--r)] border"
            style={{
              borderColor: active ? "var(--point)" : "var(--rule)",
              background: active ? "rgba(47,168,79,0.08)" : "var(--card)",
            }}
          >
            {editing ? (
              <div className="flex flex-col gap-2 p-4">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="아이 이름"
                  className="rounded-[14px] border px-4 py-2.5 text-sm outline-none"
                  style={{ borderColor: "var(--rule)", background: "var(--card)" }}
                />
                {nameError && (
                  <p className="text-xs" style={{ color: "var(--berry)" }}>
                    {nameError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="d rounded-[14px] border px-4 py-2 text-xs"
                    style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={!nameDraft.trim() || nameSaving}
                    onClick={() => saveChildName(child.id)}
                    className="d rounded-[14px] px-4 py-2 text-xs text-white disabled:opacity-40"
                    style={{ background: "var(--point)" }}
                  >
                    {nameSaving ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => selectChild(child)}
                  disabled={switching === child.id}
                  className="flex flex-1 items-center gap-3 text-left disabled:opacity-60"
                >
                  {/* 아바타 그림마다 가로폭이 달라(높이 44px 기준 토끼 17px,
                      고양이 28px) 이름 시작점이 줄마다 어긋났다 -- 고정 폭
                      상자에 가운데 정렬해서 글 칸이 항상 같은 자리에서 시작하게 한다. */}
                  <span className="flex h-11 w-11 flex-none items-center justify-center">
                    <AvatarIllustration avatar={child.avatar} height={44} style={{ opacity: active ? 1 : 0.6 }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="d truncate text-sm">{child.name}</p>
                    {child.birth_date && (
                      // 생년월일이 "2019-08-" / "10"으로 꺾이던 걸 막는다(줄 폭이 좁을 땐 잘림).
                      <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
                        {child.birth_date}
                      </p>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => startEditName(child)}
                  className="d flex-none rounded-[14px] border px-3 py-1.5 text-xs"
                  style={{ borderColor: "var(--rule)", color: "var(--point-deep)", background: "var(--card)" }}
                >
                  고치기
                </button>
                {/* "이 아이로 보기"(7글자)는 아바타·날짜·고치기까지 있는 줄에서
                    360px 폰이면 카드 밖으로 잘렸다 -- 줄 왼쪽 전체가 이미 그 아이를
                    고르는 버튼이라, 여기는 상태만 짧게 남긴다. */}
                <span className="d flex-none text-xs" style={{ color: active ? "var(--point-deep)" : "var(--ink-2)" }}>
                  {switching === child.id ? "전환 중…" : active ? "보는 중" : "›"}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="d rounded-[var(--r)] border border-dashed px-4 py-3 text-sm"
          style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
        >
          + 아이 추가
        </button>
      )}

      {adding && (
        <div
          className="flex flex-col gap-3 rounded-[var(--r)] border p-4"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="d text-xs" style={{ color: "var(--ink-2)" }}>아이 이름</span>
            <input
              type="text"
              placeholder="예: 유안"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[14px] border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--rule)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="d text-xs" style={{ color: "var(--ink-2)" }}>
              생년월일 <span style={{ opacity: 0.6 }}>(선택)</span>
            </span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="rounded-[14px] border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--rule)" }}
            />
          </label>
          <div className="flex justify-between gap-3">
            {AVATAR_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAvatar(value)}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-[var(--r)] border py-3"
                style={{
                  borderColor: avatar === value ? "var(--point)" : "var(--rule)",
                  background: avatar === value ? "rgba(47,168,79,0.08)" : "var(--card)",
                  color: avatar === value ? "var(--point-deep)" : "var(--ink)",
                }}
              >
                <AvatarIllustration avatar={value} height={56} />
                <span className="d text-xs">{label}</span>
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="d flex-1 rounded-[14px] border py-3 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!name.trim() || !avatar || saving}
              onClick={addChild}
              className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              {saving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {error && !adding && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
