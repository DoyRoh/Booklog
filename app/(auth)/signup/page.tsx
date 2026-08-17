"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col px-6 pt-16">
        <h1 className="d text-2xl">책숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          가입 확인 이메일을 보냈어요. 메일함을 확인한 뒤 로그인해 주세요.
        </p>
        <Link href="/login" className="mt-6 text-sm" style={{ color: "var(--plum)" }}>
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[420px] flex-col px-6 pt-16">
      <h1 className="d text-2xl">책숲</h1>
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
          <p className="text-sm" style={{ color: "var(--red)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="d mt-2 rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
          style={{ background: "var(--plum)" }}
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-2)" }}>
        이미 계정이 있으신가요?{" "}
        <Link href="/login" style={{ color: "var(--plum)" }}>
          로그인
        </Link>
      </p>
    </div>
  );
}
