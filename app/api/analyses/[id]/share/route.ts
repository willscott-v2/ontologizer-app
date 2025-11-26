import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Generate or toggle share token for an analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: analysis, error: fetchError } = await supabase
      .from("analyses")
      .select("id, user_id, is_public, share_token")
      .eq("id", id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (analysis.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If already public, just return the existing share token
    if (analysis.is_public && analysis.share_token) {
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://ontologizer.searchinfluence.com"}/share/${analysis.share_token}`;
      return NextResponse.json({
        shareToken: analysis.share_token,
        shareUrl,
        isPublic: true,
      });
    }

    // Generate a new share token using the database function
    const { data: tokenResult, error: tokenError } = await supabase.rpc(
      "generate_share_token"
    );

    if (tokenError) {
      console.error("Error generating share token:", tokenError);
      // Fallback: generate token in code
      const fallbackToken = Buffer.from(crypto.randomUUID()).toString("base64url").slice(0, 22);

      const { data: updated, error: updateError } = await supabase
        .from("analyses")
        .update({
          is_public: true,
          share_token: fallbackToken,
        })
        .eq("id", id)
        .select("share_token")
        .single();

      if (updateError) {
        console.error("Error updating analysis:", updateError);
        return NextResponse.json(
          { error: "Failed to generate share link" },
          { status: 500 }
        );
      }

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://ontologizer.searchinfluence.com"}/share/${fallbackToken}`;
      return NextResponse.json({
        shareToken: fallbackToken,
        shareUrl,
        isPublic: true,
      });
    }

    // Update the analysis with the share token
    const { error: updateError } = await supabase
      .from("analyses")
      .update({
        is_public: true,
        share_token: tokenResult,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating analysis:", updateError);
      return NextResponse.json(
        { error: "Failed to generate share link" },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://ontologizer.searchinfluence.com"}/share/${tokenResult}`;
    return NextResponse.json({
      shareToken: tokenResult,
      shareUrl,
      isPublic: true,
    });
  } catch (error) {
    console.error("Share API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Revoke share access (make private again)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const { data: analysis, error: fetchError } = await supabase
      .from("analyses")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (analysis.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Remove share access
    const { error: updateError } = await supabase
      .from("analyses")
      .update({
        is_public: false,
        share_token: null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error revoking share:", updateError);
      return NextResponse.json(
        { error: "Failed to revoke share link" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, isPublic: false });
  } catch (error) {
    console.error("Revoke share API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
