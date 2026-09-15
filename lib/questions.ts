import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

export type BookQuestion = { id: string; text: string };

export async function getQuestions(supabase: AnyClient): Promise<BookQuestion[]> {
  const { data } = await supabase
    .from("book_questions")
    .select("id, text")
    .order("created_at", { ascending: true });
  return data ?? [];
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
  return { id, text: trimmed };
}
