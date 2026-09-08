"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PendingMember = { id: string; childName: string };

export default function GroupApprovals({ pending }: { pending: PendingMember[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(memberId: string, status: "approved" | "rejected") {
    setBusy(memberId);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("group_members")
      .update({
        status,
        approved_at: new Date().toISOString(),
        approved_by: user?.id ?? null,
      })
      .eq("id", memberId);

    setBusy(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  if (pending.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        대기 중인 가입 신청이 없어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}
      {pending.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between gap-3 rounded-[var(--r)] border p-4"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          <p className="text-sm">{member.childName}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy === member.id}
              onClick={() => decide(member.id, "rejected")}
              className="d rounded-[14px] border px-3 py-2 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--rule)" }}
            >
              거절
            </button>
            <button
              type="button"
              disabled={busy === member.id}
              onClick={() => decide(member.id, "approved")}
              className="d rounded-[14px] px-3 py-2 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--point)" }}
            >
              승인
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
