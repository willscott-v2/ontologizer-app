import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { enrichEntities } from "@/lib/services/entity-enrichment";
import {
  generateQueryFanout,
  generateContentRecommendations,
  isGeminiAvailable,
  type QueryFanoutResult,
  type ContentRecommendationsResult,
} from "@/lib/services/gemini";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

// Fetch and parse URL content
async function fetchUrlContent(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Ontologizer/1.0; +https://theontologizer.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $("script, style, nav, footer, header").remove();

    // Extract metadata
    const title = $("title").text() || $('meta[property="og:title"]').attr("content") || "";
    const description = $('meta[name="description"]').attr("content") ||
                       $('meta[property="og:description"]').attr("content") || "";

    // Extract heading structure before removing elements
    const headings: { level: number; text: string }[] = [];
    $("h1, h2, h3, h4").each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName?.toLowerCase() || (el as any).name?.toLowerCase();
      const level = parseInt(tagName?.replace("h", "") || "0", 10);
      const text = $el.text().replace(/\s+/g, " ").trim();
      if (text && level >= 1 && level <= 4) {
        headings.push({ level, text });
      }
    });

    // Extract main content
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();

    // Limit content length for GPT (approx 3000 tokens = 12000 chars)
    const content = bodyText.substring(0, 12000);

    return {
      title,
      description,
      content,
      url,
      html, // Keep raw HTML for social profile extraction
      headings, // Existing heading structure
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch URL: ${error.message}`);
  }
}

// Extract social media profile URLs from page HTML
function extractSocialProfiles(html: string): string[] {
  const profiles: string[] = [];

  // Blocked paths that are not real profiles (tracking pixels, share buttons, etc.)
  const blockedPaths = ['tr', 'plugins', 'sharer', 'intent', 'share', 'dialog', 'oauth', 'login', 'p', 'reel', 'stories', 'pin', 'watch'];

  const socialPatterns = [
    // Facebook - company/user pages
    /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z][a-zA-Z0-9._-]{2,})/gi,
    // Twitter/X
    /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z][a-zA-Z0-9_]{1,})/gi,
    // LinkedIn company pages
    /https?:\/\/(?:www\.)?linkedin\.com\/company\/([a-zA-Z][a-zA-Z0-9-]+)\/?/gi,
    // Instagram
    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z][a-zA-Z0-9._]+)\/?/gi,
    // YouTube channels
    /https?:\/\/(?:www\.)?youtube\.com\/((?:c\/|channel\/|user\/|@)[a-zA-Z0-9_-]+)/gi,
    // Pinterest
    /https?:\/\/(?:www\.)?pinterest\.com\/([a-zA-Z][a-zA-Z0-9_]+)\/?/gi,
    // TikTok
    /https?:\/\/(?:www\.)?tiktok\.com\/(@[a-zA-Z][a-zA-Z0-9._]+)/gi,
  ];

  for (const pattern of socialPatterns) {
    let match;
    // Use exec to get capture groups
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(html)) !== null) {
      const fullUrl = match[0].replace(/\/$/, '');
      const pathPart = match[1]?.toLowerCase();

      // Skip blocked paths (tracking pixels, share dialogs, etc.)
      if (pathPart && blockedPaths.includes(pathPart.split('/')[0])) {
        continue;
      }

      if (!profiles.includes(fullUrl)) {
        profiles.push(fullUrl);
      }
    }
  }

  // Dedupe and limit to reasonable number
  return Array.from(new Set(profiles)).slice(0, 10);
}

// Analyze content with GPT-4o (Enhanced with topic salience and main topic detection)
async function analyzeContent(content: { title: string; description: string; content: string; url: string }) {
  const prompt = `Analyze the following webpage content and extract structured information with precision.

URL: ${content.url}
Title: ${content.title}
Description: ${content.description}

Content:
${content.content}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "entities": [
    {
      "name": "Entity name",
      "type": "Person | Organization | Place | Product | Event | Other",
      "description": "Brief description",
      "confidence": 0.0-1.0
    }
  ],
  "mainTopic": "The primary topic of this specific page",
  "topics": [
    {
      "name": "topic name",
      "salience": 0-100,
      "category": "primary | secondary"
    }
  ],
  "sentiment": {
    "score": "positive | neutral | negative",
    "confidence": 0.0-1.0
  },
  "summary": "2-3 sentence summary",
  "keyPoints": ["key point 1", "key point 2", ...]
}

CRITICAL INSTRUCTIONS FOR ENTITY EXTRACTION:
1. **Organizations/Brands**: Extract the EXACT company/brand names as they appear (e.g., "Search Influence", not generic industry terms)
2. **Disambiguation**: Do NOT confuse similar names - verify context (e.g., "City Business" ≠ "American City Business Journals")
3. **Proper Nouns**: Prioritize proper nouns (specific names) over generic terms
4. **Context Matters**: Consider the page domain and title when identifying the primary organization
5. **Confidence**: Use HIGH confidence (0.95-1.0) only for explicitly mentioned entities with clear context

MAIN TOPIC GUIDELINES:
- The mainTopic should be a CONCISE SEO KEYWORD PHRASE (2-5 words) that represents the primary search term this page should rank for
- Think like an SEO: what keyword would someone search to find this page?
- Examples:
  - For a company values page: "New Orleans SEO Services" (the business's target keyword)
  - For a product page: "Wireless Bluetooth Headphones"
  - For a blog post: "AI Search Optimization Tips"
- NOT verbose descriptions like "Company values and culture at Search Influence"
- Use the site's domain, industry, and page context to infer the target keyword

TOPIC SALIENCE:
- 80-100: Central to this page's purpose (appears in title/headings)
- 60-79: Major supporting topics (multiple mentions, context)
- 40-59: Moderate relevance (mentioned but not central)
- 20-39: Minor mentions (brief reference)
- 0-19: Barely mentioned

Quality over quantity - extract 8-12 highly relevant entities, not 20+ generic ones.`;

  // Check if OpenAI is configured before making the call
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured or invalid. Please check OPENAI_API_KEY environment variable.");
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    console.log(`[OpenAI] Calling model: ${model}`);

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing web content and extracting structured data for SEO purposes. You excel at identifying main topics and assigning accurate salience scores. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      analysis,
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    };
  } catch (error: any) {
    // Log detailed error information for debugging
    console.error("[OpenAI] API Error Details:", {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    // Provide more specific error messages
    if (error.status === 401) {
      throw new Error("OpenAI API authentication failed. Please check your API key.");
    } else if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    } else if (error.status === 500 || error.status === 503) {
      throw new Error("OpenAI API is temporarily unavailable. Please try again later.");
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new Error("Unable to connect to OpenAI API. Network error.");
    }

    throw new Error(`GPT analysis failed: ${error.message || "Unknown error"}`);
  }
}

// Helper to build sameAs array from entity enrichment data
// For Person entities without Wikipedia/Wikidata, prefer Google Search over KG ID
// because KG IDs for people can point to wrong individuals with same name
function buildSameAsArray(entity: any): string[] {
  const sameAs: string[] = [];
  const isPerson = entity.type === "Person";
  const hasAuthorativeSource = entity.wikipediaUrl || entity.wikidataUrl;

  if (entity.wikipediaUrl) {
    sameAs.push(entity.wikipediaUrl);
  }
  if (entity.wikidataUrl) {
    sameAs.push(entity.wikidataUrl);
  }

  // For Person entities without Wikipedia/Wikidata verification:
  // Use Google Search URL for disambiguation instead of potentially wrong KG ID
  if (isPerson && !hasAuthorativeSource) {
    // Use search URL instead of KG ID for unverified people
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(entity.name)}`;
    sameAs.push(searchUrl);
  } else if (entity.knowledgeGraphUrl) {
    // For non-Person entities or verified Person entities, use KG URL
    sameAs.push(entity.knowledgeGraphUrl);
  }

  return sameAs;
}

// Helper to get schema.org type from entity type with more specific mappings
function getSchemaType(entityType: string, entityName?: string): string {
  const typeMap: Record<string, string> = {
    "Person": "Person",
    "Organization": "Organization",
    "Place": "Place",
    "Product": "Product",
    "Event": "Event",
    "Brand": "Brand",
    "Service": "Service",
    "CreativeWork": "CreativeWork",
    "Software": "SoftwareApplication",
    "Website": "WebSite",
    "Article": "Article",
    "Book": "Book",
    "Course": "Course",
    "Movie": "Movie",
    "MusicGroup": "MusicGroup",
    "SportsTeam": "SportsTeam",
    "GovernmentOrganization": "GovernmentOrganization",
    "EducationalOrganization": "EducationalOrganization",
    "Corporation": "Corporation",
    "LocalBusiness": "LocalBusiness",
    "Restaurant": "Restaurant",
    "Hospital": "Hospital",
    "School": "School",
    "University": "CollegeOrUniversity",
  };
  return typeMap[entityType] || "Thing";
}

// Determine the best WebPage @type based on URL path and content
function determinePageType(url: string, title: string, analysis: any): string | string[] {
  const urlObj = new URL(url);
  const path = urlObj.pathname.toLowerCase();
  const titleLower = title.toLowerCase();

  // Check URL patterns for specific page types
  if (path.includes('/about') || path.includes('/company') || path.includes('/team')) {
    return "AboutPage";
  }
  if (path.includes('/contact')) {
    return "ContactPage";
  }
  if (path.includes('/faq') || path.includes('/questions')) {
    return "FAQPage";
  }
  if (path.includes('/blog') || path.includes('/news') || path.includes('/article') || path.includes('/post')) {
    return "Article";
  }
  if (path.includes('/product') || path.includes('/shop') || path.includes('/store')) {
    return "ItemPage";
  }
  if (path.includes('/service') || path.includes('/what-we-do')) {
    return "WebPage";
  }
  if (path.includes('/search') || path.includes('/results')) {
    return "SearchResultsPage";
  }
  if (path.includes('/profile') || path.includes('/portfolio')) {
    return "ProfilePage";
  }
  if (path.includes('/collection') || path.includes('/gallery')) {
    return "CollectionPage";
  }

  // Check title patterns
  if (titleLower.includes('faq') || titleLower.includes('frequently asked')) {
    return "FAQPage";
  }
  if (titleLower.includes('about us') || titleLower.includes('about ')) {
    return "AboutPage";
  }
  if (titleLower.includes('contact')) {
    return "ContactPage";
  }

  // Default based on path depth - homepage vs inner page
  if (path === '/' || path === '') {
    return "WebPage";
  }

  return "WebPage";
}

// Get more specific Organization type based on entity characteristics
function getOrganizationType(entity: any, urlHostname: string): string {
  const nameLower = entity.name?.toLowerCase() || '';
  const descLower = entity.description?.toLowerCase() || '';

  // Check for agency/service business FIRST - these are not educational orgs
  // even if they serve the education sector
  const isAgencyOrService = (
    nameLower.includes('agency') ||
    nameLower.includes('consulting') ||
    nameLower.includes('services') ||
    descLower.includes('agency') ||
    descLower.includes('marketing') ||
    descLower.includes('consulting') ||
    descLower.includes('firm')
  );

  if (isAgencyOrService) {
    return "ProfessionalService";
  }

  // Educational institutions - only if name contains institution keywords
  // Don't match just because description mentions "education" (could be an agency serving education)
  if (nameLower.includes('university') || nameLower.includes('college') ||
      nameLower.includes('school') || nameLower.includes('institute') ||
      nameLower.includes('academy')) {
    return "EducationalOrganization";
  }

  // Government
  if (nameLower.includes('government') || nameLower.includes('federal') ||
      nameLower.includes('department of') || descLower.includes('government agency')) {
    return "GovernmentOrganization";
  }

  // Non-profits
  if (descLower.includes('non-profit') || descLower.includes('nonprofit') ||
      descLower.includes('foundation') || descLower.includes('charity')) {
    return "NGO";
  }

  // Tech companies (common pattern)
  if (descLower.includes('software') || descLower.includes('technology company') ||
      descLower.includes('tech company') || descLower.includes('platform')) {
    return "Corporation";
  }

  return "Organization";
}

// Build a fully-formed entity object with proper schema.org typing
function buildEntityObject(entity: any, urlHostname?: string): any {
  let schemaType = getSchemaType(entity.type);

  // Use more specific types for organizations
  if (entity.type === "Organization" && urlHostname) {
    schemaType = getOrganizationType(entity, urlHostname);
  }

  const obj: any = {
    "@type": schemaType,
    name: entity.name,
  };

  // Add description if available
  if (entity.description) {
    obj.description = entity.description;
  }

  // Add sameAs array with all authoritative links
  const sameAs = buildSameAsArray(entity);
  if (sameAs.length > 0) {
    obj.sameAs = sameAs;
  }

  // Add ProductOntology type if available
  if (entity.productOntologyUrl) {
    obj.additionalType = entity.productOntologyUrl;
  }

  // Add identifier for entities with real Knowledge Graph IDs
  // Skip for Person entities without Wikipedia/Wikidata (KG ID might be wrong person)
  const isPerson = entity.type === "Person";
  const hasAuthoritativeSource = entity.wikipediaUrl || entity.wikidataUrl;

  if (entity.knowledgeGraphId && entity.knowledgeGraphId !== 'search') {
    // Only add KG identifier for non-Person entities or verified Person entities
    if (!isPerson || hasAuthoritativeSource) {
      obj.identifier = {
        "@type": "PropertyValue",
        propertyID: "googleKgMID",
        value: entity.knowledgeGraphId,
      };
    }
  }

  return obj;
}

// Generate rich JSON-LD structured data with proper nesting and relationships
function generateJsonLd(url: string, title: string, analysis: any, enrichedEntities: any[], socialProfiles: string[] = []) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.replace(/^www\./, '');

  // Determine the best page type based on URL and content
  const pageType = determinePageType(url, title, analysis);

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": pageType,
    "@id": url,
    url: url,
    name: title,
  };

  if (analysis.summary) {
    jsonLd.description = analysis.summary;
  }

  // Add keywords from topics
  if (analysis.topics && analysis.topics.length > 0) {
    const topicNames = analysis.topics.map((topic: any) =>
      typeof topic === 'string' ? topic : topic.name
    );
    jsonLd.keywords = topicNames.join(", ");
  }

  // Find the primary organization (website owner)
  const primaryOrg = enrichedEntities.find((e: any) =>
    e.type === "Organization" &&
    (e.name.toLowerCase().includes(hostname.split('.')[0].toLowerCase()) ||
     e.confidence >= 0.95)
  );

  // Determine mainEntity - prefer the publisher/site owner if found,
  // otherwise use the highest confidence well-enriched entity
  // The page is fundamentally "about" what the site owner offers/publishes
  let mainSubject = primaryOrg;

  // If no primary org found, fall back to highest confidence enriched entity
  if (!mainSubject) {
    mainSubject = enrichedEntities.find((e: any) =>
      e.confidence >= 0.9 && e.enrichmentSources >= 2
    );
  }

  // Add mainEntity - the primary subject this page is about
  if (mainSubject) {
    jsonLd.mainEntity = buildEntityObject(mainSubject, hostname);
  }

  // Build "about" array - high-confidence, well-enriched entities
  const aboutEntities = enrichedEntities
    .filter((e: any) =>
      e.confidence >= 0.8 &&
      e.enrichmentSources >= 2 &&
      e.name !== mainSubject?.name // Don't duplicate mainEntity
    )
    .slice(0, 5)
    .map((entity: any) => buildEntityObject(entity, hostname));

  if (aboutEntities.length > 0) {
    jsonLd.about = aboutEntities;
  }

  // Build "mentions" array - entities with at least one enrichment source
  // These are secondary entities referenced but not the main focus
  const mentionedEntities = enrichedEntities
    .filter((e: any) =>
      e.enrichmentSources >= 1 &&
      e.name !== mainSubject?.name &&
      !aboutEntities.some((a: any) => a.name === e.name)
    )
    .map((entity: any) => buildEntityObject(entity, hostname));

  if (mentionedEntities.length > 0) {
    jsonLd.mentions = mentionedEntities;
  }

  // Build publisher (the organization running the website)
  if (primaryOrg) {
    const orgType = getOrganizationType(primaryOrg, hostname);
    const orgSameAs = buildSameAsArray(primaryOrg);

    // Add social profiles to org's sameAs
    if (socialProfiles.length > 0) {
      orgSameAs.push(...socialProfiles);
    }

    const publisher: any = {
      "@type": orgType,
      "@id": `${urlObj.protocol}//${urlObj.hostname}/#organization`,
      name: primaryOrg.name,
      url: `${urlObj.protocol}//${urlObj.hostname}`,
    };

    if (primaryOrg.description) {
      publisher.description = primaryOrg.description;
    }

    if (orgSameAs.length > 0) {
      publisher.sameAs = orgSameAs;
    }

    // Add identifier with Knowledge Graph ID
    if (primaryOrg.knowledgeGraphId && primaryOrg.knowledgeGraphId !== 'search') {
      publisher.identifier = {
        "@type": "PropertyValue",
        propertyID: "googleKgMID",
        value: primaryOrg.knowledgeGraphId,
      };
    }

    // Build knowsAbout - topics/concepts the organization demonstrates expertise in
    const knowsAboutEntities = enrichedEntities
      .filter((e: any) =>
        e.name !== primaryOrg.name &&
        e.enrichmentSources >= 1 &&
        // Exclude other organizations, people, and places
        e.type !== "Person" &&
        e.type !== "Organization" &&
        e.type !== "Place"
      )
      .slice(0, 10)
      .map((entity: any) => {
        const item: any = {
          "@type": getSchemaType(entity.type),
          name: entity.name,
        };

        const sameAs = buildSameAsArray(entity);
        if (sameAs.length > 0) {
          item.sameAs = sameAs;
        }

        return item;
      });

    if (knowsAboutEntities.length > 0) {
      publisher.knowsAbout = knowsAboutEntities;
    }

    jsonLd.publisher = publisher;

    // Also add as isPartOf for the website
    jsonLd.isPartOf = {
      "@type": "WebSite",
      "@id": `${urlObj.protocol}//${urlObj.hostname}/#website`,
      url: `${urlObj.protocol}//${urlObj.hostname}`,
      name: primaryOrg.name,
      publisher: {
        "@id": `${urlObj.protocol}//${urlObj.hostname}/#organization`,
      },
    };
  }

  // Add areaServed for Place entities (geographic scope)
  const placeEntities = enrichedEntities
    .filter((e: any) => e.type === "Place" && e.enrichmentSources >= 1)
    .map((place: any) => buildEntityObject(place, hostname));

  if (placeEntities.length > 0) {
    // Add to publisher if exists, otherwise to the page
    if (jsonLd.publisher) {
      jsonLd.publisher.areaServed = placeEntities;
    } else {
      jsonLd.areaServed = placeEntities;
    }
  }

  // Add significantLinks - external authoritative resources mentioned (deduplicated)
  const significantLinksSet = new Set<string>();
  enrichedEntities
    .filter((e: any) => e.wikipediaUrl)
    .forEach((e: any) => {
      if (e.wikipediaUrl) {
        significantLinksSet.add(e.wikipediaUrl);
      }
    });

  const significantLinks = Array.from(significantLinksSet).slice(0, 8);

  if (significantLinks.length > 0) {
    jsonLd.significantLink = significantLinks;
  }

  return jsonLd;
}

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

    const { url, bypassCache = false } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check cache first
    const { data: cachedAnalysis } = await supabase
      .from("url_cache")
      .select("*")
      .eq("url", url)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedAnalysis) {
      // Return cached results
      return NextResponse.json({
        ...cachedAnalysis.analysis_result,
        cached: true,
      });
    }

    // Fetch and analyze content
    const content = await fetchUrlContent(url);
    const { analysis, promptTokens, completionTokens, totalTokens } = await analyzeContent(content);

    // Enrich entities with external sources (Wikipedia, Wikidata, etc.)
    let enrichedEntities = analysis.entities || [];
    if (enrichedEntities.length > 0) {
      try {
        const entityNames = enrichedEntities.map((e: any) => e.name);
        const enrichedData = await enrichEntities(entityNames, {
          maxEntities: 12,
          rateLimit: 500,
          useCache: !bypassCache, // Bypass cache if requested
        });

        // Merge enriched data with original entities using Map for O(1) lookups
        const enrichedMap = new Map(enrichedData.map((e) => [e.name, e]));
        enrichedEntities = enrichedEntities.map((entity: any) => {
          const enriched = enrichedMap.get(entity.name);
          if (enriched) {
            return {
              ...entity,
              wikipediaUrl: enriched.wikipediaUrl,
              wikidataUrl: enriched.wikidataUrl,
              knowledgeGraphUrl: enriched.knowledgeGraphUrl,
              productOntologyUrl: enriched.productOntologyUrl,
              enrichmentConfidence: enriched.confidence,
              enrichmentSources: enriched.sources,
              imageUrl: enriched.imageUrl,
            };
          }
          return entity;
        });
      } catch (enrichError) {
        console.error("Entity enrichment failed:", enrichError);
        // Continue with non-enriched entities
      }
    }

    // Extract social profiles from page content
    const socialProfiles = extractSocialProfiles(content.html || '');

    const jsonLd = generateJsonLd(url, content.title, analysis, enrichedEntities, socialProfiles);

    // Run Gemini analysis in parallel (Query Fanout & Content Recommendations)
    let queryFanout: QueryFanoutResult | null = null;
    let contentRecommendations: ContentRecommendationsResult | null = null;
    let geminiTotalTokens = 0;
    let geminiTotalCost = 0;

    if (isGeminiAvailable()) {
      try {
        // Format entities and topics for Gemini
        const entitiesForGemini = enrichedEntities.map((e: any) => ({
          name: e.name,
          type: e.type,
        }));
        const topicsForGemini = (analysis.topics || []).map((t: any) => ({
          name: typeof t === 'string' ? t : t.name,
          salience: typeof t === 'object' ? t.salience : 50,
          category: typeof t === 'object' ? t.category : undefined,
        }));

        // Run both Gemini analyses in parallel
        const [fanoutResult, recommendationsResult] = await Promise.all([
          generateQueryFanout(
            analysis.mainTopic || content.title,
            entitiesForGemini,
            topicsForGemini,
            url
          ),
          generateContentRecommendations(
            analysis.mainTopic || content.title,
            analysis.summary || '',
            analysis.keyPoints || [],
            entitiesForGemini,
            topicsForGemini,
            url,
            content.headings // Pass extracted headings for outline analysis
          ),
        ]);

        queryFanout = fanoutResult;
        contentRecommendations = recommendationsResult;

        // Aggregate Gemini usage
        if (queryFanout?.usage) {
          geminiTotalTokens += queryFanout.usage.totalTokens;
          geminiTotalCost += queryFanout.usage.cost;
        }
        if (contentRecommendations?.usage) {
          geminiTotalTokens += contentRecommendations.usage.totalTokens;
          geminiTotalCost += contentRecommendations.usage.cost;
        }
      } catch (geminiError) {
        console.error("Gemini analysis failed:", geminiError);
        // Continue without Gemini results
      }
    }

    // Calculate costs (GPT-4o pricing: $2.50/1M input, $10.00/1M output)
    const openaiInputCost = (promptTokens / 1_000_000) * 2.5;
    const openaiOutputCost = (completionTokens / 1_000_000) * 10.0;
    const openaiTotalCost = openaiInputCost + openaiOutputCost;
    const totalCost = openaiTotalCost + geminiTotalCost;

    // Store in database with enhanced cost tracking
    const { data: analysisRecord, error: insertError } = await supabase
      .from("analyses")
      .insert({
        user_id: user.id,
        url: url,
        title: content.title,
        entities: enrichedEntities,
        topics: analysis.topics || [],
        sentiment: analysis.sentiment || {},
        content_structure: {
          mainTopic: analysis.mainTopic,
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          queryFanout: queryFanout ? {
            relatedQueries: queryFanout.relatedQueries,
            topicalGaps: queryFanout.topicalGaps,
            competitorQueries: queryFanout.competitorQueries,
            longtailQueries: queryFanout.longtailQueries,
          } : null,
          contentRecommendations: contentRecommendations ? {
            recommendations: contentRecommendations.recommendations,
            existingOutline: contentRecommendations.existingOutline,
            suggestedOutline: contentRecommendations.suggestedOutline,
            overallScore: contentRecommendations.overallScore,
          } : null,
        },
        json_ld: jsonLd,
        model_used: process.env.OPENAI_MODEL || "gpt-4o",
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        openai_prompt_tokens: promptTokens,
        openai_completion_tokens: completionTokens,
        openai_total_tokens: totalTokens,
        openai_cost_usd: openaiTotalCost,
        gemini_total_tokens: geminiTotalTokens || null,
        gemini_cost_usd: geminiTotalCost || null,
        total_cost_usd: totalCost,
        status: 'completed',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store analysis:", insertError);
    }

    // Cache the analysis
    await supabase.from("url_cache").insert({
      url: url,
      content_hash: "", // TODO: Calculate hash
      analysis_result: {
        entities: enrichedEntities,
        mainTopic: analysis.mainTopic,
        topics: analysis.topics,
        sentiment: analysis.sentiment,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        jsonLd: jsonLd,
      },
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour cache
    });

    return NextResponse.json({
      entities: enrichedEntities,
      mainTopic: analysis.mainTopic,
      topics: analysis.topics,
      sentiment: analysis.sentiment,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      jsonLd: jsonLd,
      // Query Fanout & Content Recommendations (Gemini)
      queryFanout: queryFanout ? {
        relatedQueries: queryFanout.relatedQueries,
        topicalGaps: queryFanout.topicalGaps,
        competitorQueries: queryFanout.competitorQueries,
        longtailQueries: queryFanout.longtailQueries,
      } : null,
      contentRecommendations: contentRecommendations ? {
        recommendations: contentRecommendations.recommendations,
        existingOutline: contentRecommendations.existingOutline,
        suggestedOutline: contentRecommendations.suggestedOutline,
        overallScore: contentRecommendations.overallScore,
      } : null,
      // Token & cost tracking
      tokensUsed: totalTokens + geminiTotalTokens,
      openaiTokens: totalTokens,
      geminiTokens: geminiTotalTokens,
      cost: totalCost,
      openaiCost: openaiTotalCost,
      geminiCost: geminiTotalCost,
      cached: false,
    });

  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
