import { NextResponse } from "next/server";
import { isOpenAIConfigured } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 7) || "(none)", // Show "sk-proj" or similar
    isConfigured: isOpenAIConfigured(),
    model: model || "gpt-4o (default)",
  });
}
