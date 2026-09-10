"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { randomInviteCode } from "@/lib/invite-code";

type Child = { id: string; name: string; inviteCode: string | null };

// 배우자·조부모 등 다른 보호자를 아이 프로필에 초대해서 같은 책장(독서
// 기록)을 함께 볼 수 있게 한다. 코드를 만드는 쪽(기존 보호자)과 코드로
// 참여하는 쪽(새 보호자) 둘 다 이 컴포넌트 하나 안에 있다.
export default function ChildShare({ childList }: { childList: Child[] }) {
  const router = useRouter();
  const [codes, setCodes] = useState<Record<string, string | null>>(
    Object.fromEntries(childList.map((c) => [c.id, c.inviteCode]))
  );
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const joiningRef = useRef(false);

  async function generateCode(childId: string) {
    setGenerating(childId);
    setError(null);

    const supabase = createClient();
    // 유니크 제약 위반(다른 아이가 같은 코드를 이미 쓰는 경우)이면 한 번만
    // 다시 시도한다 -- 32자 6자리 코드라 실제로 겹칠 확률은 극히 낮다.
    for (let attempt = 0; attempt < 2; attempt++) {
      const code = randomInviteCode();
      const { error: updateError } = await supabase
        .from("children")
        .update({ invite_code: code })
        .eq("id", childId);

      if (!updateError) {
        setCodes((prev) => ({ ...prev, [childId]: code }));
        setGenerating(null);
        return;
      }
      if (updateError.code !== "23505") {
        setError(updateError.message);
        setGenerating(null);
        return;
      }
    }
    setError("코드를 만드는 데 실패했어요. 다시 시도해 주세요.");
    setGenerating(null);
  }

  function copyCode(childId: string, code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedId(childId);
      setTimeout(() => setCopiedId((id) => (id === childId ? null : id)), 1500);
    });
  }

  async function join() {
    if (!joinCode.trim() || joiningRef.current) return;
    joiningRef.current = true;
    setJoining(true);
    setJoinError(null);
    setJoinedName(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("join_child_by_invite_code", {
      p_code: joinCode.trim().toUpperCase(),
    });

    joiningRef.current = false;
    setJoining(false);
    if (rpcError) {
      setJoinError(rpcError.message);
      return;
    }
    const child = data?.[0] as { id: string; name: string } | undefined;
    if (!child) {
      setJoinError("이 코드로 아이를 찾지 못했어요.");
      return;
    }
    setJoinedName(child.name);
    setJoinCode("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {childList.length > 0 && (
        <div className="flex flex-col gap-2">
          {childList.map((child) => {
            const code = codes[child.id];
            return (
              <div
                key={child.id}
                className="flex items-center justify-between gap-3 rounded-[var(--r)] border px-4 py-3"
                style={{ borderColor: "var(--rule)", background: "var(--card)" }}
              >
                <p className="text-sm">{child.name}</p>
                {code ? (
                  <div className="flex items-center gap-2">
                    <span className="d text-sm tracking-widest" style={{ color: "var(--point-deep)" }}>
                      {code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCode(child.id, code)}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{ borderColor: "var(--rule)", color: "var(--ink-2)" }}
                    >
                      {copiedId === child.id ? "복사됨" : "복사"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={generating === child.id}
                    onClick={() => generateCode(child.id)}
                    className="d rounded-full px-3 py-1.5 text-xs text-white disabled:opacity-40"
                    style={{ background: "var(--point)" }}
                  >
                    {generating === child.id ? "만드는 중..." : "공유 코드 만들기"}
                  </button>
                )}
              </div>
            );
          })}
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            코드를 다른 보호자에게 알려주면, 그 사람도 같은 아이의 책장을 함께 보고 기록할 수 있어요.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}

      <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(38,54,43,0.08)" }}>
        <p className="d text-sm">공유 코드로 참여하기</p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="예: A1B2C3"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="flex-1 rounded-[14px] border px-4 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--rule)" }}
          />
          <button
            type="button"
            disabled={!joinCode.trim() || joining}
            onClick={join}
            className="d rounded-[14px] px-4 py-2.5 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            {joining ? "확인 중..." : "참여"}
          </button>
        </div>
        {joinError && (
          <p className="mt-2 text-sm" style={{ color: "var(--berry)" }}>
            {joinError}
          </p>
        )}
        {joinedName && (
          <p className="mt-2 text-sm" style={{ color: "var(--point-deep)" }}>
            {joinedName}의 책장에 함께하게 됐어요!
          </p>
        )}
      </div>
    </div>
  );
}
