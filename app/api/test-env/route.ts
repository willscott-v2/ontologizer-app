import { NextResponse } from "next/server";
import { createBrowserClient } from "@supabase/ssr";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabaseTest = null;
  try {
    if (url && key) {
      const client = createBrowserClient(url, key);
      supabaseTest = "Client created successfully";
    }
  } catch (error: any) {
    supabaseTest = `Error: ${error.message}`;
  }

  return NextResponse.json({
    hasUrl: !!url,
    hasKey: !!key,
    urlLength: url?.length || 0,
    keyLength: key?.length || 0,
    urlStartsWith: url?.substring(0, 8),
    keyStartsWith: key?.substring(0, 10),
    supabaseTest,
    allEnv: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')),
  });
}
