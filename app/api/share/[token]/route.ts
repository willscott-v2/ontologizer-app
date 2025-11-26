import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role client for public access (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch a shared analysis by token (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 400 });
    }

    // Fetch the analysis by share token (must be public)
    const { data: analysis, error } = await supabaseAdmin
      .from("analyses")
      .select(`
        id,
        url,
        title,
        entities,
        topics,
        sentiment,
        content_structure,
        json_ld,
        schema_types,
        total_cost_usd,
        openai_total_tokens,
        gemini_total_tokens,
        status,
        created_at
      `)
      .eq("share_token", token)
      .eq("is_public", true)
      .single();

    if (error || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found or no longer shared" },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Share fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
