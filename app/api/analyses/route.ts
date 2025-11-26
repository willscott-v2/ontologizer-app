import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/analyses - Fetch user's recent analyses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Fetch user's analyses
    const { data: analyses, error: fetchError, count } = await supabase
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
        total_cost_usd,
        status,
        created_at
      `, { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error("Failed to fetch analyses:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch analyses" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analyses: analyses || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Analyses API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
