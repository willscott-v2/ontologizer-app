import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role to bypass RLS for checking allowed emails
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email ends with @searchinfluence.com (always allowed)
    if (normalizedEmail.endsWith("@searchinfluence.com")) {
      return NextResponse.json({ allowed: true });
    }

    // Check if email is in the allowed_emails table
    const { data, error } = await supabaseAdmin
      .from("allowed_emails")
      .select("email")
      .eq("email", normalizedEmail)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, which is fine
      console.error("Error checking allowed email:", error);
      return NextResponse.json(
        { error: "Failed to verify email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ allowed: !!data });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
