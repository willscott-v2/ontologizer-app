import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Send feedback notification to Slack
async function sendSlackNotification(feedback: {
  type: string;
  message: string;
  userEmail: string;
  pageUrl?: string;
  analysisId?: string;
}) {
  const slackWebhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.log("Slack webhook not configured - skipping notification");
    return;
  }

  const typeEmoji: Record<string, string> = {
    bug: ":bug:",
    feature: ":sparkles:",
    improvement: ":bulb:",
    other: ":speech_balloon:",
  };

  const typeLabel: Record<string, string> = {
    bug: "Bug Report",
    feature: "Feature Request",
    improvement: "Improvement",
    other: "Other Feedback",
  };

  try {
    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${typeEmoji[feedback.type] || ":memo:"} New ${typeLabel[feedback.type] || "Feedback"}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*From:*\n${feedback.userEmail}`,
          },
          {
            type: "mrkdwn",
            text: `*Type:*\n${typeLabel[feedback.type] || feedback.type}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Message:*\n${feedback.message}`,
        },
      },
    ];

    // Add page URL if available
    if (feedback.pageUrl) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Page:*\n<${feedback.pageUrl}|${feedback.pageUrl}>`,
        },
      });
    }

    // Add analysis link if available
    if (feedback.analysisId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Related Analysis:*\n<${appUrl}/analysis/${feedback.analysisId}|View Analysis>`,
        },
      });
    }

    // Add divider and timestamp
    blocks.push(
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Submitted via Ontologizer at ${new Date().toISOString()}`,
          },
        ],
      }
    );

    await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    // Don't throw - Slack notification failure shouldn't break feedback submission
  }
}

// POST /api/feedback - Submit user feedback
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { type, message, pageUrl, analysisId } = body;

    // Validate required fields
    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["bug", "feature", "improvement", "other"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    // Get user agent from headers
    const userAgent = request.headers.get("user-agent") || null;

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from("feedback")
      .insert({
        user_id: user.id,
        type,
        message,
        page_url: pageUrl || null,
        analysis_id: analysisId || null,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to submit feedback:", insertError);
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 }
      );
    }

    // Send Slack notification (non-blocking)
    sendSlackNotification({
      type,
      message,
      userEmail: user.email || "Unknown",
      pageUrl: pageUrl || undefined,
      analysisId: analysisId || undefined,
    });

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        type: feedback.type,
        created_at: feedback.created_at,
      },
    });
  } catch (error: any) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/feedback - Get user's feedback history
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

    // Fetch user's feedback
    const { data: feedbackList, error: fetchError } = await supabase
      .from("feedback")
      .select("id, type, message, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error("Failed to fetch feedback:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedback: feedbackList || [],
    });
  } catch (error: any) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
