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
  json_ld: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
}
