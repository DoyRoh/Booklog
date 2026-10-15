"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // 재설정 메일 링크는 #access_token=...&refresh_token=...&type=recovery 로 온다
    // (forgot-password가 implicit 방식으로 보냄). 그 토큰으로 이 브라우저에 세션을 만든다.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    const ready =
      accessToken && refreshToken
        ? supabase.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ data }) => Boolean(data.session))
        : supabase.auth.getSession().then(({ data }) => Boolean(data.session));
    ready
      .catch(() => false)
      .then((ok) => {
        setHasSession(ok);
        setChecking(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("비밀번호가 서로 달라요. 다시 확인해 주세요.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    setDone(true);
  }

  if (checking) {
    return null;
  }

  if (!hasSession) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col px-5 pt-16">
        <h1 className="d text-2xl">책숲</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--berry)" }}>
          링크가 만료됐거나 이미 사용됐어요. 다시 요청해 주세요.
        </p>
        <Link href="/forgot-password" className="mt-6 text-sm" style={{ color: "var(--point)" }}>
          비밀번호 재설정 다시 요청하기
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col px-5 pt-16">
        <h1 className="d text-2xl">책숲</h1>
        <p className="hand mt-4 text-lg" style={{ color: "var(--point-deep)" }}>
          비밀번호가 바뀌었어요.
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          책숲 앱을 쓰고 있다면 앱으로 돌아가 새 비밀번호로 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => {
            router.replace("/today");
            router.refresh();
          }}
          className="d mt-6 rounded-[14px] py-3 text-white"
          style={{ background: "var(--point-deep)" }}
        >
          웹에서 계속하기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[420px] flex-col px-5 pt-16">
      <h1 className="d text-2xl">책숲</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        새 비밀번호를 입력해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <input
          type="password"
          required
          minLength={6}
          placeholder="새 비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-[14px] border px-4 py-3 text-sm outline-none"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "바꾸는 중..." : "비밀번호 바꾸기"}
        </button>
      </form>
    </div>
  );
}
