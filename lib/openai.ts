import OpenAI from "openai";

// Check for API key at module load for better error messages
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("OPENAI_API_KEY environment variable is not set");
}

// Initialize OpenAI client
// Using GPT-4o for advanced entity extraction and content analysis
export const openai = new OpenAI({
  apiKey: apiKey || "missing-key", // Provide fallback to prevent initialization error
});

// Helper to check if OpenAI is properly configured
export function isOpenAIConfigured(): boolean {
  return !!apiKey && apiKey.startsWith("sk-");
}

// Default model configuration
export const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Model configuration for different tasks
export const MODELS = {
  ENTITY_EXTRACTION: DEFAULT_MODEL,
  CONTENT_ANALYSIS: DEFAULT_MODEL,
  OUTLINE_GENERATION: DEFAULT_MODEL,
} as const;

// Token usage tracking helper
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Cost calculation (update rates as needed)
export function calculateCost(usage: TokenUsage): number {
  // GPT-5 pricing (example rates - update with actual pricing)
  const INPUT_COST_PER_1K = 0.01; // $0.01 per 1K input tokens
  const OUTPUT_COST_PER_1K = 0.03; // $0.03 per 1K output tokens

  const inputCost = (usage.promptTokens / 1000) * INPUT_COST_PER_1K;
  const outputCost = (usage.completionTokens / 1000) * OUTPUT_COST_PER_1K;

  return inputCost + outputCost;
}
