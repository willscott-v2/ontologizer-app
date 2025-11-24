// Configuration file for environment variables
// These are injected at build time by Next.js

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
} as const;

// Validation helper
export function validateConfig() {
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error("Missing Supabase configuration:", {
      hasUrl: !!config.supabase.url,
      hasKey: !!config.supabase.anonKey,
    });
    return false;
  }
  return true;
}
