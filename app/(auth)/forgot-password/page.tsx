"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col px-6 pt-16">
        <h1 className="d text-2xl">책숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-2)" }}>
          비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요.
        </p>
        <Link href="/login" className="mt-6 text-sm" style={{ color: "var(--point)" }}>
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[420px] flex-col px-6 pt-16">
      <h1 className="d text-2xl">책숲</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        가입한 이메일로 비밀번호 재설정 링크를 보내드려요.
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

        {error && (
          <p className="text-sm" style={{ color: "var(--berry)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="d mt-2 rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
          style={{ background: "var(--point)" }}
        >
          {loading ? "보내는 중..." : "재설정 링크 보내기"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-2)" }}>
        <Link href="/login" style={{ color: "var(--point)" }}>
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
