import type { SupabaseClient } from "@supabase/supabase-js";
import { getHiddenContent } from "@/lib/moderation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

export type BookQuestion = { id: string; text: string; createdBy?: string | null };

export async function getQuestions(supabase: AnyClient): Promise<BookQuestion[]> {
  // 내가 신고한 질문, 내가 차단한 사람이 만든 질문은 뺀다(마이그레이션 0030).
  const [{ data }, hidden] = await Promise.all([
    supabase.from("book_questions").select("id, text, created_by").order("created_at", { ascending: true }),
    getHiddenContent(supabase),
  ]);
  return ((data ?? []) as { id: string; text: string; created_by: string | null }[])
    .filter(
      (q) =>
        !hidden.reportedQuestionIds.has(q.id) && !(q.created_by && hidden.blockedUserIds.has(q.created_by))
    )
    .map((q) => ({ id: q.id, text: q.text, createdBy: q.created_by }));
}

export async function addQuestion(
  supabase: AnyClient,
  userId: string,
  text: string
): Promise<BookQuestion | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("book_questions")
    .insert({ id, text: trimmed, created_by: userId });
  if (error) throw error;
  return { id, text: trimmed, createdBy: userId };
}
