"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 계정 삭제(회원 탈퇴). Apple 심사 5.1.1(v) -- 계정을 만들 수 있으면 앱 안에서
 * 지울 수도 있어야 한다. 확인창은 window.confirm() 대신 화면 안 두 단계
 * 버튼(iOS 홈 화면 앱에서 네이티브 confirm이 안 뜨는 문제를 기록 삭제 때
 * 이미 겪음). 실제 삭제는 마이그레이션 0029의 delete_my_account()가 한다.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("delete_my_account");
    if (rpcError) {
      setError(`삭제하지 못했어요. 잠시 후 다시 시도해 주세요. (${rpcError.message})`);
      setBusy(false);
      return;
    }
    // 계정이 이미 없어서 서버 쪽 로그아웃은 실패할 수 있다 -- 로컬 세션만
    // 확실히 지우면 된다.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
    document.cookie = "chaeksup_onboarded=; Max-Age=0; path=/";
    router.replace("/login?deleted=1");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="d text-sm"
        style={{ color: "var(--ink-2)" }}
      >
        계정 삭제하기 ›
      </button>
    );
  }

  return (
    <div>
      <p className="text-sm">계정을 삭제하면 다음이 <b>영구히</b> 지워지고 되돌릴 수 없어요.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--ink-2)" }}>
        <li>내가 등록한 아이 프로필과 그 아이의 독서기록·사진·목소리·배지</li>
        <li>내가 만든 그룹과 그 그룹의 추천도서·숙제</li>
        <li>로그인 계정(이메일)과 동의 이력</li>
      </ul>
      <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>
        다른 보호자와 함께 등록한 아이는 남고, 내 연결만 끊겨요. 다른 그룹에 남긴 기록은 그룹에 그대로 있어요.
      </p>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setArmed(false);
            setError(null);
          }}
          disabled={busy}
          className="d flex-1 rounded-[14px] border py-3 text-sm disabled:opacity-60"
          style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
        >
          취소
        </button>
        {!armed ? (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="d flex-1 rounded-[14px] border py-3 text-sm"
            style={{ borderColor: "var(--berry)", color: "var(--berry)" }}
          >
            삭제할래요
          </button>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="d flex-1 rounded-[14px] py-3 text-sm text-white disabled:opacity-60"
            style={{ background: "var(--berry)" }}
          >
            {busy ? "삭제 중…" : "정말 삭제할까요?"}
          </button>
        )}
      </div>
    </div>
  );
}
