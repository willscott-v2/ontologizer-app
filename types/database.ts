// Database Types - Auto-generated from Supabase schema
// This file contains TypeScript types that match the database schema

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      analyses: {
        Row: Analysis;
        Insert: AnalysisInsert;
        Update: AnalysisUpdate;
      };
      entity_cache: {
        Row: EntityCache;
        Insert: EntityCacheInsert;
        Update: EntityCacheUpdate;
      };
      url_cache: {
        Row: UrlCache;
        Insert: UrlCacheInsert;
        Update: UrlCacheUpdate;
      };
      feedback: {
        Row: Feedback;
        Insert: FeedbackInsert;
        Update: FeedbackUpdate;
      };
      templates: {
        Row: Template;
        Insert: TemplateInsert;
        Update: TemplateUpdate;
      };
    };
  };
}

// ============================================================================
// PROFILE
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  analyses_count: number;
  total_tokens_used: number;
  openai_tokens_used: number;
  gemini_tokens_used: number;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  analyses_count?: number;
  total_tokens_used?: number;
  openai_tokens_used?: number;
  gemini_tokens_used?: number;
  total_cost_usd?: number;
}

export interface ProfileUpdate {
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  analyses_count?: number;
  total_tokens_used?: number;
  openai_tokens_used?: number;
  gemini_tokens_used?: number;
  total_cost_usd?: number;
}

// ============================================================================
// ANALYSIS
// ============================================================================

export interface Analysis {
  id: string;
  user_id: string | null;
  url: string;
  title: string | null;
  meta_description: string | null;
  raw_html: string | null;
  cleaned_text: string | null;
  entities: EntitiesData | null;
  topics: TopicsData | null;
  sentiment: SentimentData | null;
  content_structure: ContentStructure | null;
  json_ld: Record<string, any> | null;
  schema_types: string[] | null;
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  openai_prompt_tokens: number | null;
  openai_completion_tokens: number | null;
  openai_total_tokens: number | null;
  openai_cost_usd: number | null;
  gemini_prompt_tokens: number | null;
  gemini_completion_tokens: number | null;
  gemini_total_tokens: number | null;
  gemini_cost_usd: number | null;
  total_cost_usd: number | null;
  processing_time_ms: number | null;
  status: AnalysisStatus;
  error_message: string | null;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisInsert {
  id?: string;
  user_id?: string | null;
  url: string;
  title?: string | null;
  meta_description?: string | null;
  raw_html?: string | null;
  cleaned_text?: string | null;
  entities?: EntitiesData | null;
  topics?: TopicsData | null;
  sentiment?: SentimentData | null;
  content_structure?: ContentStructure | null;
  json_ld?: Record<string, any> | null;
  schema_types?: string[] | null;
  model_used?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  processing_time_ms?: number | null;
  status?: AnalysisStatus;
  error_message?: string | null;
  is_public?: boolean;
  share_token?: string | null;
}

export interface AnalysisUpdate {
  url?: string;
  title?: string | null;
  meta_description?: string | null;
  raw_html?: string | null;
  cleaned_text?: string | null;
  entities?: EntitiesData | null;
  topics?: TopicsData | null;
  sentiment?: SentimentData | null;
  content_structure?: ContentStructure | null;
  json_ld?: Record<string, any> | null;
  schema_types?: string[] | null;
  model_used?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  processing_time_ms?: number | null;
  status?: AnalysisStatus;
  error_message?: string | null;
  is_public?: boolean;
  share_token?: string | null;
}

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

// Entity extraction data structure
export interface EntitiesData {
  people?: EntityItem[];
  organizations?: EntityItem[];
  locations?: EntityItem[];
  products?: EntityItem[];
  events?: EntityItem[];
}

export interface EntityItem {
  name: string;
  type: string;
  confidence?: number;
  context?: string;
  mentions?: number;
}

// Topics data structure
export interface TopicsData {
  primary?: string[];
  secondary?: string[];
  keywords?: KeywordItem[];
}

export interface KeywordItem {
  keyword: string;
  relevance?: number;
  count?: number;
}

// Sentiment data structure
export interface SentimentData {
  score: number; // -1 to 1
  label: "positive" | "neutral" | "negative";
  confidence: number;
}

// Content structure
export interface ContentStructure {
  headings?: HeadingItem[];
  sections?: SectionItem[];
  outline?: OutlineItem[];
  wordCount?: number;
  paragraphCount?: number;
}

export interface HeadingItem {
  level: number;
  text: string;
  id?: string;
}

export interface SectionItem {
  title: string;
  content: string;
  type?: string;
}

export interface OutlineItem {
  text: string;
  level: number;
  children?: OutlineItem[];
}

// ============================================================================
// ENTITY CACHE
// ============================================================================

export interface EntityCache {
  id: string;
  url: string;
  content_hash: string;
  entities: EntitiesData;
  topics: TopicsData | null;
  model_used: string | null;
  created_at: string;
  expires_at: string;
  hit_count: number;
}

export interface EntityCacheInsert {
  id?: string;
  url: string;
  content_hash: string;
  entities: EntitiesData;
  topics?: TopicsData | null;
  model_used?: string | null;
  expires_at?: string;
  hit_count?: number;
}

export interface EntityCacheUpdate {
  url?: string;
  content_hash?: string;
  entities?: EntitiesData;
  topics?: TopicsData | null;
  model_used?: string | null;
  expires_at?: string;
  hit_count?: number;
}

// ============================================================================
// URL CACHE
// ============================================================================

export interface UrlCache {
  id: string;
  url: string;
  raw_html: string | null;
  cleaned_text: string | null;
  title: string | null;
  meta_description: string | null;
  content_hash: string | null;
  status_code: number | null;
  content_type: string | null;
  content_length: number | null;
  created_at: string;
  expires_at: string;
  hit_count: number;
}

export interface UrlCacheInsert {
  id?: string;
  url: string;
  raw_html?: string | null;
  cleaned_text?: string | null;
  title?: string | null;
  meta_description?: string | null;
  content_hash?: string | null;
  status_code?: number | null;
  content_type?: string | null;
  content_length?: number | null;
  expires_at?: string;
  hit_count?: number;
}

export interface UrlCacheUpdate {
  url?: string;
  raw_html?: string | null;
  cleaned_text?: string | null;
  title?: string | null;
  meta_description?: string | null;
  content_hash?: string | null;
  status_code?: number | null;
  content_type?: string | null;
  content_length?: number | null;
  expires_at?: string;
  hit_count?: number;
}

// ============================================================================
// FEEDBACK
// ============================================================================

export interface Feedback {
  id: string;
  analysis_id: string | null;
  user_id: string | null;
  rating: number | null;
  feedback_text: string | null;
  feedback_type: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface FeedbackInsert {
  id?: string;
  analysis_id?: string | null;
  user_id?: string | null;
  rating?: number | null;
  feedback_text?: string | null;
  feedback_type?: string | null;
  user_agent?: string | null;
}

export interface FeedbackUpdate {
  analysis_id?: string | null;
  user_id?: string | null;
  rating?: number | null;
  feedback_text?: string | null;
  feedback_type?: string | null;
  user_agent?: string | null;
}

// ============================================================================
// TEMPLATE
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string | null;
  schema_type: string;
  template_json: Record<string, any>;
  category: string | null;
  is_public: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateInsert {
  id?: string;
  name: string;
  description?: string | null;
  schema_type: string;
  template_json: Record<string, any>;
  category?: string | null;
  is_public?: boolean;
  use_count?: number;
}

export interface TemplateUpdate {
  name?: string;
  description?: string | null;
  schema_type?: string;
  template_json?: Record<string, any>;
  category?: string | null;
  is_public?: boolean;
  use_count?: number;
}
