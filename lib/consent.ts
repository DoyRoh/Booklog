import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

// 온보딩에서 수집한 음성 녹음 동의(consents.type = 'voice_recording')를
// 확인한다. 동의를 안 했으면(선택 항목이라 false일 수 있음) 낭독 미션·음성
// 메모 녹음 UI 자체를 노출하지 않는다.
export async function hasVoiceConsent(supabase: AnyClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("consents")
    .select("agreed")
    .eq("user_id", userId)
    .eq("type", "voice_recording")
    .order("agreed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.agreed ?? false;
}
