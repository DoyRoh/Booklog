"use client";

import { useState } from "react";
import SceneBanner from "@/components/scene-banner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [exists, setExists] = useState(false);
  // 이메일 확인 메일을 보내지 않으므로(Supabase "Confirm email" 꺼짐), 오타로 가입하면
  // 비밀번호를 잊었을 때 찾을 수 없다 — 가입 직전에 이메일을 한 번 더 보여주고 확인받는다.
  // iOS 앱 웹뷰에서 window.confirm이 안 뜰 수 있어 화면 안 단계로 만든다.
  const [confirming, setConfirming] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExists(false);
    setLoading(true);

    const supabase = createClient();

    // 이미 가입된 이메일이면 signUp을 부르지 않는다 — Supabase는 중복 가입에도
    // 오류 없이 확인 메일을 다시 보내기 때문. (함수가 아직 없으면 그냥 진행)
    const { data: registered } = await supabase.rpc("is_email_registered", { p_email: email });
    if (registered === true) {
      setLoading(false);
      setExists(true);
      return;
    }
    setLoading(false);
    setConfirming(true);
  }

  async function confirmSignup() {
    setError(null);
    setLoading(true);
    const supabase = createClient();

    // 확인 메일의 링크가 localhost(Supabase Site URL 기본값)가 아니라 지금 쓰는
    // 주소로 돌아오게 한다. 앱(Capacitor)에서도 origin은 배포 주소다.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding` },
    });

    setLoading(false);
    setConfirming(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    // 위 확인을 건너뛴 경우의 대비: 이미 있는 이메일이면 identities가 빈 배열로 온다.
    if (data.user && data.user.identities?.length === 0) {
      setExists(true);
      return;
    }
    // 이메일 확인을 끈 프로젝트면 가입과 동시에 로그인 세션이 온다 — 메일 안내 대신 바로 온보딩으로.
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col px-5 pt-16">
        <h1 className="d text-2xl">책숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          <b style={{ color: "var(--ink)" }}>{email}</b>로 가입 확인 메일을 보냈어요.
        </p>
        <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm" style={{ color: "var(--ink-2)" }}>
          <li>메일함(스팸함 포함)에서 책숲 메일을 열고</li>
          <li>메일 속 확인 링크를 누른 뒤</li>
          <li>책숲으로 돌아와 로그인해 주세요.</li>
        </ol>
        <Link href="/login" className="mt-6 text-sm" style={{ color: "var(--point)" }}>
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[420px] flex-col px-5 pt-10">
      <SceneBanner scene="parade" height={170} />
      <h1 className="d mt-6 text-2xl">책숲</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        이메일로 회원가입하세요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setConfirming(false);
          }}
          className="rounded-[14px] border px-4 py-3 text-sm outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-[14px] border px-4 py-3 text-sm outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />

        {error && (
          <p className="text-sm" style={{ color: "var(--berry)" }}>
            {error}
          </p>
        )}

        {exists && (
          <div className="rounded-[14px] px-4 py-3 text-sm" style={{ background: "var(--card)" }}>
            <p style={{ color: "var(--berry)" }}>이미 가입된 이메일이에요.</p>
            <p className="mt-1" style={{ color: "var(--ink-2)" }}>
              <Link href="/login" style={{ color: "var(--point)" }}>
                로그인
              </Link>
              하거나, 비밀번호가 기억나지 않으면{" "}
              <Link href="/forgot-password" style={{ color: "var(--point)" }}>
                비밀번호 찾기
              </Link>
              를 눌러 주세요.
            </p>
          </div>
        )}

        {confirming ? (
          <div
            className="mt-2 rounded-[14px] border px-4 py-4"
            style={{ borderColor: "var(--point)", background: "var(--card)" }}
          >
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              이 이메일이 맞나요?
            </p>
            <p className="d mt-1 break-all text-base" style={{ color: "var(--ink)" }}>
              {email.trim()}
            </p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
              로그인과 비밀번호 찾기에 쓰여요. 틀리면 나중에 비밀번호를 잊었을 때 계정을 찾을 수 없어요.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="d flex-1 rounded-[14px] border py-3 text-sm disabled:opacity-60"
                style={{ borderColor: "var(--rule)" }}
              >
                다시 입력
              </button>
              <button
                type="button"
                onClick={confirmSignup}
                disabled={loading}
                className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
                style={{ background: "var(--point)" }}
              >
                {loading ? "가입 중..." : "맞아요, 가입하기"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="d mt-2 rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
            style={{ background: "var(--point)" }}
          >
            {loading ? "확인 중..." : "회원가입"}
          </button>
        )}
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-2)" }}>
        이미 계정이 있으신가요?{" "}
        <Link href="/login" style={{ color: "var(--point)" }}>
          로그인
        </Link>
      </p>
    </div>
  );
}
