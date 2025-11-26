/**
 * Entity Enrichment Service
 *
 * Enriches extracted entities with data from multiple sources:
 * - Wikipedia: Article URLs and descriptions
 * - Wikidata: Structured entity IDs and properties
 * - Google Knowledge Graph: Entity IDs and canonical URLs
 * - ProductOntology: Product type classifications
 *
 * Features:
 * - Multi-source enrichment with fallbacks
 * - Confidence scoring (0-100)
 * - Rate limiting (500ms delays)
 * - Circuit breaker (12/18 entity limit)
 * - Entity-level caching (7-day TTL)
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface EnrichedEntity {
  name: string;
  type: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  wikidataId?: string;
  knowledgeGraphUrl?: string;
  knowledgeGraphId?: string;
  productOntologyUrl?: string;
  confidence: number; // 0-100
  sources: number; // Count of external sources found
  description?: string;
  imageUrl?: string;
}

export interface EntityEnrichmentOptions {
  enableWikipedia?: boolean;
  enableWikidata?: boolean;
  enableKnowledgeGraph?: boolean;
  enableProductOntology?: boolean;
  maxEntities?: number;
  cacheResults?: boolean;
  useCache?: boolean;
  rateLimit?: number; // Delay in ms between API calls
}

interface CachedEntityData {
  name: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  wikidataId?: string;
  knowledgeGraphUrl?: string;
  knowledgeGraphId?: string;
  productOntologyUrl?: string;
  confidence: number;
  sources: number;
  description?: string;
  imageUrl?: string;
  cached_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API_BASE = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_ENTITY_BASE = 'https://www.wikidata.org/wiki/';
const PRODUCT_ONTOLOGY_BASE = 'http://www.productontology.org/id/';
const KNOWLEDGE_GRAPH_BASE = 'https://www.google.com/search?kgmid=';

const DEFAULT_OPTIONS: EntityEnrichmentOptions = {
  enableWikipedia: true,
  enableWikidata: true,
  enableKnowledgeGraph: true,
  enableProductOntology: true,
  maxEntities: 12,
  cacheResults: true,
  useCache: true,
  rateLimit: 500, // 500ms between API calls
};

const CACHE_TTL_DAYS = 7;
const MIN_CONFIDENCE_FOR_CACHE = 80;
const MIN_SOURCES_FOR_CACHE = 2;

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

export async function enrichEntities(
  entities: string[],
  options: EntityEnrichmentOptions = {}
): Promise<EnrichedEntity[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const enrichedEntities: EnrichedEntity[] = [];

  if (!opts.useCache) {
    console.log('🔄 Entity cache BYPASSED - forcing fresh enrichment for all entities');
  }

  let processedCount = 0;
  let cacheHits = 0;

  // Circuit breaker: adjust max based on cache hits
  const getMaxEntities = () => {
    if (cacheHits >= 5) {
      return 18; // Increase limit if we have lots of cache hits
    }
    return opts.maxEntities || 12;
  };

  for (const entityName of entities) {
    // Check circuit breaker
    if (processedCount >= getMaxEntities()) {
      console.log(`Circuit breaker: Stopped after ${processedCount} entities`);
      break;
    }

    // Check cache first
    if (opts.useCache) {
      const cached = await getCachedEntity(entityName);
      if (cached) {
        enrichedEntities.push({
          ...cached,
          name: entityName, // Override cached name with original
          type: 'unknown', // Will be filled by caller
        });
        cacheHits++;
        processedCount++;
        continue;
      }
    }

    // Enrich from external sources
    try {
      const enriched = await enrichSingleEntity(entityName, opts);
      enrichedEntities.push(enriched);
      processedCount++;

      // Cache if high quality
      if (
        opts.cacheResults &&
        enriched.confidence >= MIN_CONFIDENCE_FOR_CACHE &&
        enriched.sources >= MIN_SOURCES_FOR_CACHE
      ) {
        await cacheEntity(entityName, enriched);
      }

      // Rate limiting
      if (opts.rateLimit && processedCount < entities.length) {
        await delay(opts.rateLimit);
      }
    } catch (error) {
      console.error(`Error enriching entity "${entityName}":`, error);
      // Return minimal data on error
      enrichedEntities.push({
        name: entityName,
        type: 'unknown',
        confidence: 0,
        sources: 0,
      });
      processedCount++;
    }
  }

  console.log(`Enrichment complete: ${processedCount} entities processed, ${cacheHits} cache hits`);
  return enrichedEntities;
}

// ============================================================================
// SINGLE ENTITY ENRICHMENT
// ============================================================================

async function enrichSingleEntity(
  entityName: string,
  options: EntityEnrichmentOptions
): Promise<EnrichedEntity> {
  const result: EnrichedEntity = {
    name: entityName,
    type: 'unknown',
    confidence: 0,
    sources: 0,
  };

  // Wikipedia enrichment
  if (options.enableWikipedia) {
    const wikipediaData = await enrichWithWikipedia(entityName);
    if (wikipediaData) {
      result.wikipediaUrl = wikipediaData.url;
      result.description = wikipediaData.description;
      result.sources++;
      result.confidence += 30;
    }
  }

  // Wikidata enrichment
  if (options.enableWikidata && result.wikipediaUrl) {
    const wikidataData = await enrichWithWikidata(entityName, result.wikipediaUrl);
    if (wikidataData) {
      result.wikidataUrl = wikidataData.url;
      result.wikidataId = wikidataData.id;
      result.imageUrl = wikidataData.imageUrl;
      result.sources++;
      result.confidence += 25;
    }
  }

  // Knowledge Graph enrichment
  if (options.enableKnowledgeGraph) {
    const kgData = await enrichWithKnowledgeGraph(entityName);
    if (kgData) {
      result.knowledgeGraphUrl = kgData.url;
      result.knowledgeGraphId = kgData.id;
      result.sources++;
      result.confidence += 25;
    }
  }

  // ProductOntology enrichment
  if (options.enableProductOntology) {
    const productData = await enrichWithProductOntology(entityName);
    if (productData) {
      result.productOntologyUrl = productData.url;
      result.sources++;
      result.confidence += 20;
    }
  }

  // Cap confidence at 100
  result.confidence = Math.min(result.confidence, 100);

  return result;
}

// ============================================================================
// WIKIPEDIA ENRICHMENT
// ============================================================================

async function enrichWithWikipedia(
  entityName: string
): Promise<{ url: string; description?: string } | null> {
  try {
    // Search Wikipedia
    const searchUrl = new URL(WIKIPEDIA_API_BASE);
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', entityName);
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('srlimit', '5'); // Get more results to find better matches
    searchUrl.searchParams.set('origin', '*'); // Enable CORS

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'Ontologizer/1.0 (https://theontologizer.com; contact@theontologizer.com)',
        'Accept': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      console.error(`Wikipedia API error: ${searchResponse.status} ${searchResponse.statusText}`);
      return null;
    }

    const searchData = await searchResponse.json();

    if (!searchData.query?.search?.length) {
      return null;
    }

    // Find best matching result using similarity scoring
    const normalizedQuery = entityName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const result of searchData.query.search) {
      const normalizedTitle = result.title.toLowerCase().trim();

      // Exact match gets highest score - instant accept
      if (normalizedTitle === normalizedQuery) {
        bestMatch = result;
        bestScore = 100;
        console.log(`Wikipedia: Exact match for "${entityName}" -> "${result.title}"`);
        break;
      }

      // Calculate similarity score
      let score = 0;

      // Title exactly starts with query (very high confidence)
      // e.g., "ChatGPT" matches "ChatGPT Plus" or "ChatGPT (software)"
      if (normalizedTitle.startsWith(normalizedQuery + " ") ||
          normalizedTitle.startsWith(normalizedQuery + " (") ||
          normalizedTitle === normalizedQuery + ")") {
        score = 80;
      }
      // Title is query with disambiguation suffix like "ChatGPT (chatbot)"
      else if (normalizedTitle.startsWith(normalizedQuery + " (")) {
        score = 80;
      }
      // Query exactly starts with title (high confidence)
      else if (normalizedQuery.startsWith(normalizedTitle + " ")) {
        score = 60;
      }
      // For single-word queries: check if title contains query as whole word
      else if (!normalizedQuery.includes(' ')) {
        // Single word query - check for title starting with query or containing it as primary word
        const titleFirstWord = normalizedTitle.split(/[\s(]/)[0];
        if (titleFirstWord === normalizedQuery) {
          score = 75; // High confidence - first word matches exactly
        }
      }
      // Word-level exact matching for multi-word queries
      else {
        const queryWords = normalizedQuery.split(/\s+/).filter((w: string) => w.length > 2);
        const titleWords = normalizedTitle.split(/\s+/).filter((w: string) => w.length > 2);

        // Calculate word overlap ratio (both directions)
        const queryInTitle = queryWords.filter((word: string) => titleWords.includes(word)).length;
        const titleInQuery = titleWords.filter((word: string) => queryWords.includes(word)).length;

        if (queryWords.length > 0 && titleWords.length > 0) {
          const queryRatio = queryInTitle / queryWords.length;
          const titleRatio = titleInQuery / titleWords.length;

          // Both must have good overlap
          if (queryRatio >= 0.8 && titleRatio >= 0.6) {
            score = 50;
          } else if (queryRatio >= 0.6 && titleRatio >= 0.4) {
            score = 30;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }

    // Minimum score threshold: 50 (much stricter)
    // This prevents weak matches like "Influencer" for "Search Influence"
    if (bestScore < 50) {
      console.log(`Wikipedia: No match for "${entityName}" (best score: ${bestScore})`);
      return null;
    }

    console.log(`Wikipedia: Matched "${entityName}" -> "${bestMatch.title}" (score: ${bestScore})`)

    const pageTitle = bestMatch.title;

    // Get page extract for description
    const extractUrl = new URL(WIKIPEDIA_API_BASE);
    extractUrl.searchParams.set('action', 'query');
    extractUrl.searchParams.set('prop', 'extracts');
    extractUrl.searchParams.set('exintro', '1');
    extractUrl.searchParams.set('explaintext', '1');
    extractUrl.searchParams.set('titles', pageTitle);
    extractUrl.searchParams.set('format', 'json');
    extractUrl.searchParams.set('origin', '*');

    const extractResponse = await fetch(extractUrl.toString(), {
      headers: {
        'User-Agent': 'Ontologizer/1.0 (https://theontologizer.com; contact@theontologizer.com)',
        'Accept': 'application/json',
      },
    });
    const extractData = await extractResponse.json();

    const pages = extractData.query?.pages;
    const pageId = Object.keys(pages)[0];
    const description = pages[pageId]?.extract?.substring(0, 200);

    const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

    return {
      url: wikipediaUrl,
      description,
    };
  } catch (error) {
    console.error('Wikipedia enrichment error:', error);
    return null;
  }
}

// ============================================================================
// WIKIDATA ENRICHMENT
// ============================================================================

async function enrichWithWikidata(
  entityName: string,
  wikipediaUrl?: string
): Promise<{ url: string; id: string; imageUrl?: string } | null> {
  try {
    let wikidataId: string | null = null;

    // Try to get Wikidata ID from Wikipedia URL
    if (wikipediaUrl) {
      const pageTitle = wikipediaUrl.split('/wiki/')[1];
      if (pageTitle) {
        const url = new URL(WIKIPEDIA_API_BASE);
        url.searchParams.set('action', 'query');
        url.searchParams.set('prop', 'pageprops');
        url.searchParams.set('titles', decodeURIComponent(pageTitle));
        url.searchParams.set('format', 'json');
        url.searchParams.set('origin', '*');

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'Ontologizer/1.0 (https://theontologizer.com; contact@theontologizer.com)',
            'Accept': 'application/json',
          },
        });
        const data = await response.json();

        const pages = data.query?.pages;
        const pageId = Object.keys(pages)[0];
        wikidataId = pages[pageId]?.pageprops?.wikibase_item;
      }
    }

    // Fallback: Direct Wikidata search
    if (!wikidataId) {
      const searchUrl = new URL(WIKIDATA_API_BASE);
      searchUrl.searchParams.set('action', 'wbsearchentities');
      searchUrl.searchParams.set('search', entityName);
      searchUrl.searchParams.set('language', 'en');
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('limit', '1');
      searchUrl.searchParams.set('origin', '*');

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          'User-Agent': 'Ontologizer/1.0 (https://theontologizer.com; contact@theontologizer.com)',
          'Accept': 'application/json',
        },
      });
      const searchData = await searchResponse.json();

      if (searchData.search?.length) {
        wikidataId = searchData.search[0].id;
      }
    }

    if (!wikidataId) {
      return null;
    }

    // Get entity data including image
    const entityUrl = new URL(WIKIDATA_API_BASE);
    entityUrl.searchParams.set('action', 'wbgetentities');
    entityUrl.searchParams.set('ids', wikidataId);
    entityUrl.searchParams.set('props', 'claims');
    entityUrl.searchParams.set('format', 'json');
    entityUrl.searchParams.set('origin', '*');

    const entityResponse = await fetch(entityUrl.toString(), {
      headers: {
        'User-Agent': 'Ontologizer/1.0 (https://theontologizer.com; contact@theontologizer.com)',
        'Accept': 'application/json',
      },
    });
    const entityData = await entityResponse.json();

    const entity = entityData.entities?.[wikidataId];
    let imageUrl: string | undefined;

    // Try to get image (P18)
    const imageClaim = entity?.claims?.P18?.[0];
    if (imageClaim) {
      const imageFile = imageClaim.mainsnak?.datavalue?.value;
      if (imageFile) {
        imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}?width=300`;
      }
    }

    return {
      url: `${WIKIDATA_ENTITY_BASE}${wikidataId}`,
      id: wikidataId,
      imageUrl,
    };
  } catch (error) {
    console.error('Wikidata enrichment error:', error);
    return null;
  }
}

// ============================================================================
// KNOWLEDGE GRAPH ENRICHMENT
// ============================================================================

async function enrichWithKnowledgeGraph(
  entityName: string
): Promise<{ url: string; id: string } | null> {
  try {
    const apiKey = process.env.GOOGLE_KNOWLEDGE_GRAPH_API_KEY;

    // If no API key, generate search URL as fallback
    if (!apiKey) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(entityName)}`;
      return {
        url: searchUrl,
        id: 'search', // Placeholder
      };
    }

    // Use Knowledge Graph API
    const url = new URL('https://kgsearch.googleapis.com/v1/entities:search');
    url.searchParams.set('query', entityName);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.itemListElement?.length) {
      // No KG result - fall back to Google Search URL
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(entityName)}`;
      return {
        url: searchUrl,
        id: 'search',
      };
    }

    const result = data.itemListElement[0].result;
    const kgId = result['@id']?.replace('kg:', '');

    if (!kgId) {
      // No KG ID in result - fall back to Google Search URL
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(entityName)}`;
      return {
        url: searchUrl,
        id: 'search',
      };
    }

    return {
      url: `${KNOWLEDGE_GRAPH_BASE}${kgId}`,
      id: kgId,
    };
  } catch (error) {
    console.error('Knowledge Graph enrichment error:', error);
    return null;
  }
}

// ============================================================================
// PRODUCT ONTOLOGY ENRICHMENT
// ============================================================================

async function enrichWithProductOntology(
  entityName: string
): Promise<{ url: string } | null> {
  try {
    // ProductOntology uses simple URL pattern
    const normalizedName = entityName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_');

    const url = `${PRODUCT_ONTOLOGY_BASE}${normalizedName}`;

    // Check if URL exists (HEAD request)
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return { url };
      }
    } catch {
      // If HEAD fails, still return URL (may work)
      return { url };
    }

    return null;
  } catch (error) {
    console.error('ProductOntology enrichment error:', error);
    return null;
  }
}

// ============================================================================
// CACHING
// ============================================================================

async function getCachedEntity(entityName: string): Promise<CachedEntityData | null> {
  try {
    const supabase = await createClient();
    const normalizedName = entityName.toLowerCase().trim();

    const { data, error } = await supabase
      .from('enriched_entity_cache')
      .select('*')
      .eq('entity_name_normalized', normalizedName)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Increment hit count
    await supabase
      .from('enriched_entity_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('id', data.id);

    return data.entity_data as CachedEntityData;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
}

async function cacheEntity(
  entityName: string,
  enrichedData: EnrichedEntity
): Promise<void> {
  try {
    const supabase = await createClient();
    const normalizedName = entityName.toLowerCase().trim();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    const cacheData: CachedEntityData = {
      name: enrichedData.name,
      wikipediaUrl: enrichedData.wikipediaUrl,
      wikidataUrl: enrichedData.wikidataUrl,
      wikidataId: enrichedData.wikidataId,
      knowledgeGraphUrl: enrichedData.knowledgeGraphUrl,
      knowledgeGraphId: enrichedData.knowledgeGraphId,
      productOntologyUrl: enrichedData.productOntologyUrl,
      confidence: enrichedData.confidence,
      sources: enrichedData.sources,
      description: enrichedData.description,
      imageUrl: enrichedData.imageUrl,
      cached_at: new Date().toISOString(),
    };

    await supabase
      .from('enriched_entity_cache')
      .upsert({
        entity_name: entityName,
        entity_name_normalized: normalizedName,
        entity_data: cacheData,
        confidence: enrichedData.confidence,
        sources: enrichedData.sources,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'entity_name_normalized',
      });

    console.log(`Cached entity: ${entityName} (confidence: ${enrichedData.confidence}, sources: ${enrichedData.sources})`);
  } catch (error) {
    console.error('Cache storage error:', error);
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
