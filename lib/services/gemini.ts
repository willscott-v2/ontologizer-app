import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!geminiApiKey) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(geminiApiKey);
  }
  return genAI;
}

// Token usage tracking
export interface GeminiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

// Gemini 2.0 Flash pricing: $0.10/1M input, $0.40/1M output
function calculateGeminiCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens * 0.0000001) + (completionTokens * 0.0000004);
}

// Query Fanout: Generate related queries to expand topical coverage analysis
export interface QueryFanoutResult {
  relatedQueries: string[];
  topicalGaps: string[];
  competitorQueries: string[];
  longtailQueries: string[];
  usage: GeminiUsage;
}

export async function generateQueryFanout(
  mainTopic: string,
  entities: { name: string; type: string }[],
  topics: { name: string; salience: number }[],
  url: string
): Promise<QueryFanoutResult | null> {
  const client = getGeminiClient();
  if (!client) {
    console.log("Gemini API key not configured - skipping query fanout");
    return null;
  }

  try {
    const model = client.getGenerativeModel({ model: geminiModel });

    const entityList = entities.slice(0, 10).map(e => `${e.name} (${e.type})`).join(", ");
    const topicList = topics.slice(0, 10).map(t => `${t.name}: ${t.salience}/100`).join(", ");
    const domain = new URL(url).hostname.replace(/^www\./, "");

    const prompt = `You are an SEO and content strategy expert. Analyze the following page content signals and generate strategic query recommendations.

**Page Analysis:**
- Main Topic: ${mainTopic}
- Domain: ${domain}
- Key Entities: ${entityList}
- Topic Salience: ${topicList}

**Generate the following (5-7 items each, be specific and actionable):**

1. **Related Queries**: Search queries that users interested in this topic would also search for
2. **Topical Gaps**: Questions/topics this page should address but likely doesn't cover well
3. **Competitor Queries**: Queries that competing pages likely rank for
4. **Long-tail Queries**: Specific, lower-competition phrases related to the main topic

Return as JSON:
{
  "relatedQueries": ["query1", "query2", ...],
  "topicalGaps": ["gap1", "gap2", ...],
  "competitorQueries": ["query1", "query2", ...],
  "longtailQueries": ["query1", "query2", ...]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse Gemini query fanout response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Calculate usage (estimate if not provided)
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(text.length / 4);

    return {
      relatedQueries: parsed.relatedQueries || [],
      topicalGaps: parsed.topicalGaps || [],
      competitorQueries: parsed.competitorQueries || [],
      longtailQueries: parsed.longtailQueries || [],
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cost: calculateGeminiCost(promptTokens, completionTokens),
      },
    };
  } catch (error) {
    console.error("Gemini query fanout error:", error);
    return null;
  }
}

// Content Recommendations: Gap analysis and outline suggestions
export interface ContentRecommendation {
  category: "semantic_gap" | "content_depth" | "structure" | "strategic";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedHeading?: string;
}

export interface ContentRecommendationsResult {
  recommendations: ContentRecommendation[];
  existingOutline: { heading: string; level: number }[];
  suggestedOutline: { heading: string; level: number; reason: string; isNew?: boolean }[];
  overallScore: number;
  usage: GeminiUsage;
}

export async function generateContentRecommendations(
  mainTopic: string,
  summary: string,
  keyPoints: string[],
  entities: { name: string; type: string }[],
  topics: { name: string; salience: number; category?: string }[],
  url: string,
  existingHeadings?: { level: number; text: string }[]
): Promise<ContentRecommendationsResult | null> {
  const client = getGeminiClient();
  if (!client) {
    console.log("Gemini API key not configured - skipping content recommendations");
    return null;
  }

  try {
    const model = client.getGenerativeModel({ model: geminiModel });

    const entityList = entities.slice(0, 15).map(e => `${e.name} (${e.type})`).join(", ");
    const topicList = topics.slice(0, 15).map(t => {
      const cat = t.category ? ` [${t.category}]` : "";
      return `${t.name}: ${t.salience}/100${cat}`;
    }).join(", ");
    const keyPointsList = keyPoints.slice(0, 10).map((p, i) => `${i + 1}. ${p}`).join("\n");
    const domain = new URL(url).hostname.replace(/^www\./, "");

    // Format existing headings for the prompt
    const existingOutlineText = existingHeadings && existingHeadings.length > 0
      ? existingHeadings.slice(0, 20).map(h => `${"  ".repeat(h.level - 1)}H${h.level}: ${h.text}`).join("\n")
      : "No headings found on page";

    const prompt = `You are an expert SEO content strategist. Analyze this page's existing structure and content coverage, then recommend an IMPROVED outline that fills gaps.

**Page Analysis:**
- URL: ${url}
- Domain: ${domain}
- Main Topic: ${mainTopic}
- Summary: ${summary}
- Key Points:
${keyPointsList}
- Entities: ${entityList}
- Topics & Salience: ${topicList}

**EXISTING PAGE HEADINGS:**
${existingOutlineText}

**Your Task:**

1. **Content Recommendations** (6-10 items): Identify gaps and improvements across these categories:
   - semantic_gap: Missing topics/concepts that should be covered
   - content_depth: Areas needing more detailed coverage
   - structure: Heading/organization improvements
   - strategic: SEO and user engagement improvements

2. **Improved Outline**: Create a COMPLETE recommended outline that:
   - KEEPS good existing headings (mark isNew: false)
   - ADDS new headings to fill topical gaps (mark isNew: true)
   - REORGANIZES if the current structure is poor
   - Addresses the semantic gaps and missing topics identified
   - Include reasoning for each heading

3. **Overall Content Score**: 0-100 based on topical coverage, depth, and structure

Return as JSON:
{
  "recommendations": [
    {
      "category": "semantic_gap|content_depth|structure|strategic",
      "title": "Brief title",
      "description": "Detailed actionable recommendation",
      "priority": "high|medium|low",
      "suggestedHeading": "Optional H2/H3 text"
    }
  ],
  "suggestedOutline": [
    {"heading": "H2 text", "level": 2, "reason": "Why this heading", "isNew": true}
  ],
  "overallScore": 75
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse Gemini content recommendations response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Calculate usage
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(text.length / 4);

    // Map existing headings to the expected format
    const existingOutline = (existingHeadings || []).map(h => ({
      heading: h.text,
      level: h.level,
    }));

    return {
      recommendations: parsed.recommendations || [],
      existingOutline,
      suggestedOutline: parsed.suggestedOutline || [],
      overallScore: parsed.overallScore || 0,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cost: calculateGeminiCost(promptTokens, completionTokens),
      },
    };
  } catch (error) {
    console.error("Gemini content recommendations error:", error);
    return null;
  }
}

// Check if Gemini is available
export function isGeminiAvailable(): boolean {
  return !!geminiApiKey;
}
