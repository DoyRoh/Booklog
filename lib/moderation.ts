import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

export type HiddenContent = {
  /** 내가 신고한 그룹 — 신고하면 그 즉시 내 화면에서 숨긴다. */
  reportedGroupIds: Set<string>;
  /** 내가 신고한 질문. */
  reportedQuestionIds: Set<string>;
  /** 내가 차단한 사용자 — 그 사람이 만든 그룹·질문이 전부 안 보인다. */
  blockedUserIds: Set<string>;
};

export const REPORT_REASONS = ["부적절한 내용", "스팸·광고", "저작권 침해", "기타"] as const;

/**
 * 신고·차단 목록(마이그레이션 0030). 아직 마이그레이션 전이라 테이블이
 * 없으면 오류를 무시하고 빈 목록으로 -- 숨길 게 없다는 뜻일 뿐 화면이
 * 깨질 이유는 없다.
 */
export async function getHiddenContent(supabase: AnyClient): Promise<HiddenContent> {
  const [{ data: reports }, { data: blocks }] = await Promise.all([
    supabase.from("content_reports").select("target_type, target_id"),
    supabase.from("user_blocks").select("blocked_id"),
  ]);
  const reportedGroupIds = new Set<string>();
  const reportedQuestionIds = new Set<string>();
  for (const r of (reports ?? []) as { target_type: string; target_id: string }[]) {
    if (r.target_type === "group") reportedGroupIds.add(r.target_id);
    else if (r.target_type === "question") reportedQuestionIds.add(r.target_id);
  }
  const blockedUserIds = new Set(((blocks ?? []) as { blocked_id: string }[]).map((b) => b.blocked_id));
  return { reportedGroupIds, reportedQuestionIds, blockedUserIds };
}

export function isGroupHidden(hidden: HiddenContent, group: { id: string; owner_id?: string | null }) {
  return hidden.reportedGroupIds.has(group.id) || (!!group.owner_id && hidden.blockedUserIds.has(group.owner_id));
}
