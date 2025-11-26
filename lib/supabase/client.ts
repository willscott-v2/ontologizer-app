import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Missing Supabase environment variables:", {
      hasUrl: !!url,
      hasKey: !!key,
      url: url || "(undefined)",
      keyPrefix: key ? key.substring(0, 10) + "..." : "(undefined)",
    });
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file and restart the dev server."
    );
  }

  return createBrowserClient(url, key);
}
