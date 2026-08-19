import type { SupabaseClient } from "@supabase/supabase-js";

export const READING_MEDIA_BUCKET = "reading-media";

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

export async function uploadChildVoice(
  supabase: AnyClient,
  childId: string,
  blob: Blob
): Promise<string> {
  const path = `${childId}/voice-${crypto.randomUUID()}.webm`;
  const { error } = await supabase.storage
    .from(READING_MEDIA_BUCKET)
    .upload(path, blob, { contentType: "audio/webm" });
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
  const path = `${childId}/mission-${missionId}.webm`;
  const { error } = await supabase.storage
    .from(READING_MEDIA_BUCKET)
    .upload(path, blob, { contentType: "audio/webm", upsert: true });
  if (error) throw error;
  return path;
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
