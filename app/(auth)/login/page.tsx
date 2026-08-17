"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/today");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-[420px] flex-col px-6 pt-16">
      <h1 className="d text-2xl">책숲</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        이메일로 로그인하세요.
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
          placeholder="비밀번호"
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
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-2)" }}>
        계정이 없으신가요?{" "}
        <Link href="/signup" style={{ color: "var(--plum)" }}>
          회원가입
        </Link>
      </p>
    </div>
  );
}
