"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REASONS } from "@/lib/moderation";

/**
 * 그룹 상세(다른 사람이 만든 그룹)의 신고·차단.
 * - 신고: 이유를 고르면 content_reports에 남고, 그 그룹은 내 화면에서 바로 숨겨진다.
 * - 차단: 이 그룹을 만든 숲지기를 차단 -- 그 사람이 만든 그룹·질문이 전부 안 보이고,
 *   아이가 그 사람 그룹을 따르고 있었다면 함께 나간다.
 * 확인은 window.confirm 대신 화면 안 단계로(iOS 웹뷰에서 confirm이 안 뜰 수 있어서).
 */
export default function GroupReportBlock({
  groupId,
  ownerId,
  operatorName,
  activeChildId,
}: {
  groupId: string;
  ownerId: string;
  operatorName: string | null;
  activeChildId: string | null;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "report" | "block">("none");
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const busyRef = useRef(false);
  const who = operatorName ? `숲지기 ${operatorName}` : "이 그룹의 숲지기";

  async function leaveOwnerGroups(supabase: ReturnType<typeof createClient>) {
    if (!activeChildId) return;
    const { data: owned } = await supabase.from("groups").select("id").eq("owner_id", ownerId);
    const ids = (owned ?? []).map((g) => g.id as string);
    if (!ids.includes(groupId)) ids.push(groupId);
    await supabase.from("group_members").delete().eq("child_id", activeChildId).in("group_id", ids);
  }

  async function submitReport() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const text = detail.trim() ? `${reason}: ${detail.trim()}` : reason;
    const { error: dbError } = await supabase
      .from("content_reports")
      .insert({ target_type: "group", target_id: groupId, reason: text });
    busyRef.current = false;
    setBusy(false);
    if (dbError) {
      setError("신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setDone("신고했어요. 24시간 안에 확인하고 조치할게요. 이 그룹은 이제 내 화면에 보이지 않아요.");
  }

  async function submitBlock() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("user_blocks").insert({ blocked_id: ownerId });
    if (dbError && dbError.code !== "23505") {
      busyRef.current = false;
      setBusy(false);
      setError("차단하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    await leaveOwnerGroups(supabase);
    busyRef.current = false;
    setBusy(false);
    setDone(`${who}을(를) 차단했어요. 이 숲지기가 만든 그룹과 질문은 이제 보이지 않아요.`);
  }

  if (done) {
    return (
      <div className="rounded-[14px] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
        <p className="text-sm">{done}</p>
        <button
          type="button"
          onClick={() => {
            router.push("/recommend");
            router.refresh();
          }}
          className="d mt-3 w-full rounded-[14px] py-2.5 text-sm text-white"
          style={{ background: "var(--point-deep)" }}
        >
          그룹 목록으로
        </button>
      </div>
    );
  }

  return (
    <div>
      {panel === "none" && (
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "var(--ink-2)" }}>
          <button type="button" onClick={() => setPanel("report")} className="underline underline-offset-2">
            이 그룹 신고하기
          </button>
          <span aria-hidden>·</span>
          <button type="button" onClick={() => setPanel("block")} className="underline underline-offset-2">
            숲지기 차단하기
          </button>
        </div>
      )}

      {panel === "report" && (
        <div className="rounded-[14px] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
          <p className="d text-sm">이 그룹을 신고할까요?</p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            운영자가 24시간 안에 확인하고, 문제가 있으면 내용을 지우거나 계정을 정지해요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-full border px-3 py-1 text-xs"
                style={
                  reason === r
                    ? { borderColor: "var(--point-deep)", background: "var(--point-deep)", color: "#fff" }
                    : { borderColor: "var(--rule)", color: "var(--ink)" }
                }
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="자세한 내용 (선택)"
            rows={2}
            className="mt-3 w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--rule)", background: "var(--card)" }}
          />
          {error && (
            <p className="mt-2 text-xs" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPanel("none")}
              className="d flex-1 rounded-[14px] border py-2.5 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submitReport}
              className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--berry)" }}
            >
              신고하기
            </button>
          </div>
        </div>
      )}

      {panel === "block" && (
        <div className="rounded-[14px] border px-4 py-3" style={{ borderColor: "var(--rule)", background: "var(--card)" }}>
          <p className="d text-sm">{who}을(를) 차단할까요?</p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            이 숲지기가 만든 그룹과 질문이 모두 보이지 않고, 아이가 따르던 이 숲지기의 그룹에서도 나가요.
          </p>
          {error && (
            <p className="mt-2 text-xs" style={{ color: "var(--berry)" }}>
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPanel("none")}
              className="d flex-1 rounded-[14px] border py-2.5 text-sm"
              style={{ borderColor: "var(--rule)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submitBlock}
              className="d flex-1 rounded-[14px] py-2.5 text-sm text-white disabled:opacity-40"
              style={{ background: "var(--berry)" }}
            >
              차단하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
