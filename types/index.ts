// Core type definitions for the Ontologizer application

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface StructuredDataSchema {
  id: string;
  user_id: string;
  url: string;
  schema_type: string;
  json_ld: JsonLdSchema;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  success: boolean;
  data?: AnalysisData;
  error?: string;
}

// Entity types for content analysis
export interface Entity {
  name: string;
  type: EntityType;
  salience: number;
  description?: string;
  // Enrichment data
  wikipediaUrl?: string;
  wikidataUrl?: string;
  knowledgeGraphUrl?: string;
  productOntologyUrl?: string;
  enrichmentConfidence?: number;
  enrichmentSources?: string[];
  imageUrl?: string;
}

export type EntityType =
  | 'Person'
  | 'Organization'
  | 'Place'
  | 'Product'
  | 'Event'
  | 'CreativeWork'
  | 'Service'
  | 'Brand'
  | 'Concept'
  | 'Technology'
  | 'MedicalCondition'
  | 'Drug'
  | 'FoodEstablishment'
  | 'LocalBusiness'
  | 'SoftwareApplication'
  | 'WebSite'
  | 'Thing';

// Topic types for content analysis
export interface Topic {
  name: string;
  salience: number;
  category?: string;
}

// Query Fanout results from Gemini
export interface QueryFanout {
  relatedQueries: string[];
  contentGaps: string[];
  competitorKeywords: string[];
  longTailQueries: string[];
}

// Content Recommendations from Gemini
export interface ContentRecommendation {
  type: 'add_section' | 'expand_content' | 'add_entity' | 'improve_structure';
  priority: 'high' | 'medium' | 'low';
  description: string;
  suggestedHeading?: string;
}

export interface OutlineItem {
  level: number;
  heading: string;
  isNew?: boolean;
  reason?: string;
}

export interface ContentRecommendations {
  recommendations: ContentRecommendation[];
  existingOutline: OutlineItem[];
  suggestedOutline: OutlineItem[];
}

// Full analysis data structure
export interface AnalysisData {
  url: string;
  title: string;
  entities: Entity[];
  topics: Topic[];
  jsonLd: JsonLdSchema;
  queryFanout?: QueryFanout;
  contentRecommendations?: ContentRecommendations;
  // Token usage and costs
  totalTokens: number;
  totalCost: number;
  openaiTokens?: number;
  openaiCost?: number;
  geminiTokens?: number;
  geminiCost?: number;
}

// JSON-LD Schema types
export interface JsonLdSchema {
  '@context': string;
  '@graph': JsonLdNode[];
}

export interface JsonLdNode {
  '@type': string | string[];
  '@id'?: string;
  name?: string;
  description?: string;
  url?: string;
  sameAs?: string[];
  [key: string]: unknown;
}

// Dashboard analysis list item
export interface AnalysisListItem {
  id: string;
  url: string;
  title: string;
  entities: Entity[];
  topics: Topic[];
  sentiment?: string;
  total_cost_usd: number;
  created_at: string;
}
