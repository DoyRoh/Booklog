import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { fetchWithTimeout } from "./fetch-with-timeout";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // 폰 회선은 서버보다 느려 20초. 사진·음성 업로드(storage)는 제외된다.
    { global: { fetch: fetchWithTimeout(20_000) } }
  );
}
