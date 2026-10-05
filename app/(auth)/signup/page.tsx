"use client";

import { useState } from "react";
import SceneBanner from "@/components/scene-banner";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [exists, setExists] = useState(false);

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

    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    // 위 확인을 건너뛴 경우의 대비: 이미 있는 이메일이면 identities가 빈 배열로 온다.
    if (data.user && data.user.identities?.length === 0) {
      setExists(true);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col px-5 pt-16">
        <h1 className="d text-2xl">책숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          가입 확인 이메일을 보냈어요. 메일함을 확인한 뒤 로그인해 주세요.
        </p>
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
          onChange={(e) => setEmail(e.target.value)}
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

        <button
          type="submit"
          disabled={loading}
          className="d mt-2 rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
          style={{ background: "var(--point)" }}
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
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
