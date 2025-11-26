import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/analyses/[id] - Fetch a single analysis by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Fetch the analysis
    const { data: analysis, error: fetchError } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Analysis not found" },
          { status: 404 }
        );
      }
      console.error("Failed to fetch analysis:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/analyses/[id] - Delete an analysis
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Delete the analysis (RLS will ensure user can only delete their own)
    const { error: deleteError } = await supabase
      .from("analyses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Failed to delete analysis:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
