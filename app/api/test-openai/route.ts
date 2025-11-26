import { NextResponse } from "next/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5";

  const config = {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 7) || "(none)",
    isConfigured: isOpenAIConfigured(),
    model: model,
  };

  // Try a simple test call to OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: "Say hello in one word." }],
      max_tokens: 10,
    });

    return NextResponse.json({
      ...config,
      testCall: "success",
      response: completion.choices[0]?.message?.content,
    });
  } catch (error: any) {
    return NextResponse.json({
      ...config,
      testCall: "failed",
      error: {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
      },
    });
  }
}
