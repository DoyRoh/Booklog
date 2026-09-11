import type { SupabaseClient } from "@supabase/supabase-js";

export const READING_MEDIA_BUCKET = "reading-media";
export const BOOK_COVERS_BUCKET = "book-covers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

// 오브젝트 이름은 항상 "{child_id}/..."로 시작해야 한다 -- storage.objects
// RLS가 이 첫 폴더 세그먼트만으로 보호자 소유권을 판정한다.
export async function uploadChildPhoto(
  supabase: AnyClient,
  childId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${childId}/photo-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(READING_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return path;
}

// 녹음 blob의 실제 형식(아이폰 mp4 / 크롬 webm / ogg)에 맞춰 확장자와
// Content-Type을 정한다 -- 형식을 잘못 붙이면 사파리가 재생을 거부한다.
function audioExt(blob: Blob): { ext: string; contentType: string } {
  const type = (blob.type || "audio/webm").split(";")[0];
  if (type === "audio/mp4" || type === "audio/aac" || type === "audio/x-m4a") return { ext: "m4a", contentType: "audio/mp4" };
  if (type === "audio/ogg") return { ext: "ogg", contentType: "audio/ogg" };
  if (type === "audio/mpeg") return { ext: "mp3", contentType: "audio/mpeg" };
  return { ext: "webm", contentType: "audio/webm" };
}

export async function uploadChildVoice(
  supabase: AnyClient,
  childId: string,
  blob: Blob
): Promise<string> {
  const { ext, contentType } = audioExt(blob);
  const path = `${childId}/voice-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(READING_MEDIA_BUCKET)
    .upload(path, blob, { contentType });
  if (error) throw error;
  return path;
}

// 미션당 아이 하나에 녹음 하나만 있으면 되므로, 경로를 mission_id로
// 고정해 다시 녹음하면 upsert로 덮어쓴다(파일이 계속 쌓이지 않게).
export async function uploadMissionVoice(
  supabase: AnyClient,
  childId: string,
  missionId: string,
  blob: Blob
): Promise<string> {
  const { ext, contentType } = audioExt(blob);
  const path = `${childId}/mission-${missionId}.${ext}`;
  const { error } = await supabase.storage
    .from(READING_MEDIA_BUCKET)
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

// 카카오 검색에 없는 책(대개 전권 세트) 표지를 부모·숲지기가 직접 찍어
// 올린다. book-covers는 공개 버킷이라 서명 없이 공개 URL을 바로 돌려주면
// 다른 화면들이 이미 books.cover_url에 쓰던 <img src> 그대로 보여준다.
// 경로를 업로더 자신의 auth.uid()로 시작해야 한다(storage.objects RLS).
export async function uploadBookCover(
  supabase: AnyClient,
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BOOK_COVERS_BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(BOOK_COVERS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getSignedMediaUrl(
  supabase: AnyClient,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(READING_MEDIA_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
