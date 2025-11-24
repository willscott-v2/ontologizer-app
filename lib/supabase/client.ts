import { createBrowserClient } from "@supabase/ssr";
import { config, validateConfig } from "@/lib/config";

export function createClient() {
  if (!validateConfig()) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file and restart the dev server."
    );
  }

  return createBrowserClient(config.supabase.url, config.supabase.anonKey);
}
