import type { SupabaseClient } from "@supabase/supabase-js";

// "내 도서관"(최대 3곳)은 계정 메타데이터(auth user_metadata.libraries)에 둔다 —
// 테이블·마이그레이션 없이 기기 사이에서 따라오고, 세션에서 바로 읽힌다.
export type SavedLibrary = { code: string; name: string };
export const MAX_LIBRARIES = 3;
export const LIBRARIES_CHANGED = "chaeksup:libraries-changed";

export async function loadMyLibraries(supabase: SupabaseClient): Promise<SavedLibrary[]> {
  const { data } = await supabase.auth.getSession();
  const raw = data.session?.user.user_metadata?.libraries;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is SavedLibrary => typeof l?.code === "string" && typeof l?.name === "string")
    .slice(0, MAX_LIBRARIES);
}

export async function saveMyLibraries(supabase: SupabaseClient, libraries: SavedLibrary[]) {
  const { error } = await supabase.auth.updateUser({ data: { libraries: libraries.slice(0, MAX_LIBRARIES) } });
  if (!error) window.dispatchEvent(new Event(LIBRARIES_CHANGED));
  return error;
}
