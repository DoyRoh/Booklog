"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FoundGroup = { id: string; name: string; type: string; join_policy: string };

export default function JoinByCode({ activeChildId }: { activeChildId: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [found, setFound] = useState<FoundGroup | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<"pending" | "approved" | null>(null);
  const joiningRef = useRef(false);

  async function search() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setFound(null);
    setNotFound(false);
    setJoined(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("find_group_by_invite_code", {
      p_code: code.trim().toUpperCase(),
    });

    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const group = data?.[0] as FoundGroup | undefined;
    if (!group) {
      setNotFound(true);
      return;
    }
    setFound(group);
  }

  async function join() {
    if (!found) return;
    if (!activeChildId) {
      setError("먼저 더보기에서 아이를 등록해 주세요.");
      return;
    }
    // state 업데이트를 기다리지 않고 동기적으로 막아서, 가입 버튼을
    // 빠르게 두 번 눌러도 group_members가 중복 생성되지 않게 한다.
    if (joiningRef.current) return;
    joiningRef.current = true;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const status = found.join_policy === "open" ? "approved" : "pending";
    const { error: joinError } = await supabase.from("group_members").insert({
      group_id: found.id,
      child_id: activeChildId,
      role: "member",
      status,
    });

    joiningRef.current = false;
    setLoading(false);
    if (joinError) {
      // 유니크 제약 위반(23505)이면 이미 신청/가입돼 있다는 뜻이니 그
      // 상태로 안내한다.
      if (joinError.code !== "23505") {
        setError(joinError.message);
        return;
      }
    }
    setJoined(status);
    router.refresh();
  }

  return (
    <div
      className="rounded-[var(--r)] border p-4"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      <p className="d text-sm">초대 코드로 참가하기</p>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          placeholder="예: A1B2C3"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 rounded-[14px] border px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--rule)" }}
        />
        <button
          type="button"
          disabled={!code.trim() || loading}
          onClick={search}
          className="d rounded-[14px] px-4 py-2.5 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--point)" }}
        >
          찾기
        </button>
      </div>

      {notFound && (
        <p className="mt-2 text-sm" style={{ color: "var(--berry)" }}>
          이 코드로 그룹을 찾지 못했어요.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm" style={{ color: "var(--berry)" }}>
          {error}
        </p>
      )}

      {found && !joined && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm">{found.name}</p>
          <button
            type="button"
            disabled={loading}
            onClick={join}
            className="d rounded-[14px] px-4 py-2 text-sm text-white disabled:opacity-40"
            style={{ background: "var(--point)" }}
          >
            {found.join_policy === "open" ? "팔로우" : "가입 신청"}
          </button>
        </div>
      )}

      {joined === "pending" && (
        <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
          가입 신청을 보냈어요. 승인을 기다려 주세요.
        </p>
      )}
      {joined === "approved" && (
        <p className="mt-3 text-sm" style={{ color: "var(--point-deep)" }}>
          가입했어요!
        </p>
      )}
    </div>
  );
}
