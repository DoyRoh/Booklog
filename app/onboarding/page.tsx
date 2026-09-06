"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "@/components/sign-out-button";
import { RabbitIcon, DogIcon, CatIcon } from "@/components/icons/avatar-icons";

type Role = "parent" | "teacher" | "curator";
type Avatar = "rabbit" | "dog" | "cat";
type Step = "role" | "consent" | "child";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "parent", label: "아이 & 부모", description: "아이와 독서를 기록해요" },
  { value: "teacher", label: "교사", description: "학급 추천도서·숙제를 관리해요" },
  { value: "curator", label: "큐레이터", description: "기관·크리에이터로 추천도서를 발행해요" },
];

const AVATARS: { value: Avatar; label: string; Icon: typeof RabbitIcon }[] = [
  { value: "rabbit", label: "토끼", Icon: RabbitIcon },
  { value: "dog", label: "강아지", Icon: DogIcon },
  { value: "cat", label: "고양이", Icon: CatIcon },
];

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Bounds the native date picker's year to a sensible range for a child's
// birth date (today, and up to 18 years back) -- this also keeps the
// browser's year segment to 4 digits instead of letting it accept up to 6.
const TODAY = new Date();
const MAX_BIRTH_DATE = toDateInputValue(TODAY);
const MIN_BIRTH_DATE = toDateInputValue(
  new Date(TODAY.getFullYear() - 18, TODAY.getMonth(), TODAY.getDate())
);

const cardStyle = (selected: boolean): React.CSSProperties => ({
  borderColor: selected ? "var(--point)" : "var(--rule)",
  background: selected ? "rgba(47,168,79,0.08)" : "var(--card)",
  color: selected ? "var(--point-deep)" : "var(--ink)",
});

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedVoice, setAgreedVoice] = useState(false);
  const [childName, setChildName] = useState("");
  const [childBirthDate, setChildBirthDate] = useState("");
  const [childAvatar, setChildAvatar] = useState<Avatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goToConsent() {
    if (!role) return;
    setStep("consent");
  }

  function goToChildOrFinish() {
    if (!agreedTerms) return;
    if (role === "parent") {
      setStep("child");
    } else {
      finish();
    }
  }

  async function finish() {
    if (!role) return;
    if (role === "parent" && (!childName.trim() || !childAvatar)) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("로그인 정보를 확인할 수 없어요. 다시 로그인해 주세요.");
      setSaving(false);
      return;
    }

    // 계정 하나가 아이 프로필과 선생님/기관 프로필을 동시에 가질 수
    // 있어서, role은 이제 "최초에 고른 기본값" 정도의 의미다. 지금 당장
    // 보여줄 화면은 active_profile_type으로 정하고, 나중에 더보기에서
    // 다른 프로필을 추가하면 그때그때 전환할 수 있다.
    const { error: roleError } = await supabase
      .from("users")
      .update({ role, active_profile_type: role === "parent" ? "child" : "operator" })
      .eq("id", user.id);
    if (roleError) {
      setError(roleError.message);
      setSaving(false);
      return;
    }

    const { error: consentError } = await supabase.from("consents").insert([
      { user_id: user.id, type: "terms_privacy", agreed: true },
      { user_id: user.id, type: "voice_recording", agreed: agreedVoice },
    ]);
    if (consentError) {
      setError(consentError.message);
      setSaving(false);
      return;
    }

    if (role === "parent") {
      // Insert the id ourselves instead of asking Postgres to hand it back
      // (.select().single() after insert): the "children" SELECT policy
      // only allows rows the caller is already linked to via
      // child_guardians, and that link doesn't exist until the next insert
      // below, so requesting the row back right after creating it always
      // fails RLS ("new row violates row-level security policy").
      const childId = crypto.randomUUID();
      const { error: childError } = await supabase.from("children").insert({
        id: childId,
        name: childName.trim(),
        birth_date: childBirthDate || null,
        avatar: childAvatar,
      });
      if (childError) {
        setError(childError.message);
        setSaving(false);
        return;
      }

      const { error: guardianError } = await supabase.from("child_guardians").insert({
        child_id: childId,
        user_id: user.id,
        role: "owner",
      });
      if (guardianError) {
        setError(guardianError.message);
        setSaving(false);
        return;
      }
    }

    // Marked last, only once every step above has actually succeeded --
    // otherwise a failure partway through (e.g. child registration) would
    // still leave onboarding_completed=true, and proxy.ts would then bounce
    // the user straight past /onboarding into an empty /today with no
    // child ever created.
    const { error: completeError } = await supabase
      .from("users")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    if (completeError) {
      setError(completeError.message);
      setSaving(false);
      return;
    }

    router.replace("/today");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col px-6 pt-12 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="d text-2xl">책숲</h1>
        <SignOutButton />
      </div>

      {step === "role" && (
        <div className="mt-8 flex flex-col gap-4">
          <div>
            <p className="d text-lg">어떤 역할로 함께하시나요?</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              일단 하나를 골라 시작해요. 나중에 더보기에서 다른 프로필(아이/선생님/기관)도 이 계정에 추가할 수 있어요.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className="rounded-[var(--r)] border px-4 py-3 text-left transition-colors"
                style={cardStyle(role === r.value)}
              >
                <p className="d text-base">{r.label}</p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>
                  {r.description}
                </p>
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!role}
            onClick={goToConsent}
            className="d mt-4 rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            다음
          </button>
        </div>
      )}

      {step === "consent" && (
        <div className="mt-8 flex flex-col gap-4">
          <div>
            <p className="d text-lg">약관에 동의해 주세요</p>
          </div>

          <label
            className="flex items-start gap-3 rounded-[var(--r)] border px-4 py-3"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span style={{ color: "var(--berry)" }}>(필수)</span> 이용약관 및 개인정보처리방침에 동의합니다
            </span>
          </label>

          <label
            className="flex items-start gap-3 rounded-[var(--r)] border px-4 py-3"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          >
            <input
              type="checkbox"
              checked={agreedVoice}
              onChange={(e) => setAgreedVoice(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span style={{ color: "var(--ink-2)" }}>(선택)</span> 음성 독서기록 녹음 및 보관에 동의합니다
            </span>
          </label>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setStep("role")}
              className="d flex-1 rounded-[14px] border py-3 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              이전
            </button>
            <button
              type="button"
              disabled={!agreedTerms || saving}
              onClick={goToChildOrFinish}
              className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              {saving ? "저장 중..." : role === "parent" ? "다음" : "시작하기"}
            </button>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
        </div>
      )}

      {step === "child" && (
        <div className="mt-8 flex flex-col gap-4">
          <div>
            <p className="d text-lg">아이를 등록해 주세요</p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
              아바타를 고르면 그 발자국 모양으로 도장이 찍혀요.
            </p>
          </div>

          <input
            type="text"
            required
            placeholder="아이 이름"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            className="rounded-[14px] border px-4 py-3 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
          <input
            type="date"
            value={childBirthDate}
            onChange={(e) => setChildBirthDate(e.target.value)}
            min={MIN_BIRTH_DATE}
            max={MAX_BIRTH_DATE}
            className="rounded-[14px] border px-4 py-3 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />

          <div className="flex justify-between gap-3">
            {AVATARS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setChildAvatar(value)}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-[var(--r)] border py-3"
                style={cardStyle(childAvatar === value)}
              >
                <Icon />
                <span className="d text-sm">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setStep("consent")}
              className="d flex-1 rounded-[14px] border py-3 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              이전
            </button>
            <button
              type="button"
              disabled={!childName.trim() || !childAvatar || saving}
              onClick={finish}
              className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              {saving ? "저장 중..." : "시작하기"}
            </button>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
