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

/** 내 도서관을 고를 때 마지막으로 고른 지역(시/도 코드) — "다른 도서관에서 찾기"의 기본값. */
export async function loadMyRegion(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const raw = data.session?.user.user_metadata?.library_region;
  return typeof raw === "string" ? raw : "";
}

export async function saveMyLibraries(supabase: SupabaseClient, libraries: SavedLibrary[], region?: string) {
  const payload: Record<string, unknown> = { libraries: libraries.slice(0, MAX_LIBRARIES) };
  if (region) payload.library_region = region;
  const { error } = await supabase.auth.updateUser({ data: payload });
  if (!error) window.dispatchEvent(new Event(LIBRARIES_CHANGED));
  return error;
}
