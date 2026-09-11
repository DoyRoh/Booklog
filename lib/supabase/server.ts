import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { fetchWithTimeout } from "./fetch-with-timeout";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 서버에서 나가는 요청은 전부 짧은 조회라 8초면 충분하다(넘기면 DB가
      // 멈춘 것 -- 흰 화면 대신 오류 안내로).
      global: { fetch: fetchWithTimeout(8_000) },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; ignore when a middleware
            // is refreshing the session instead.
          }
        },
      },
    }
  );
}
