// Search-related types for pupt-lib

/**
 * A prompt that can be indexed and searched
 */
export interface SearchablePrompt {
  name: string;
  title?: string;
  description?: string;
  tags: string[];
  library: string;
  content?: string;
}

/**
 * Options for searching prompts
 */
export interface SearchOptions {
  query?: string;
  tags?: string[];
  library?: string;
  limit?: number;
  offset?: number;
  fuzzy?: boolean;
}

/**
 * A single search result with score
 */
export interface SearchResult {
  prompt: SearchablePrompt;
  score: number;
  matches: SearchResultMatch[];
}

/**
 * A match within a search result
 */
export interface SearchResultMatch {
  field: string;
  indices: number[];
}

/**
 * Configuration for the search engine
 */
export interface SearchEngineConfig {
  /** Minimum score threshold for results (default: 0.3) */
  threshold?: number;
  /** Field weights for scoring (default: name=3, tags=2, description=1.5, content=1) */
  weights?: {
    name?: number;
    title?: number;
    description?: number;
    tags?: number;
    content?: number;
  };
  /** Enable fuzzy matching for typo tolerance (default: true) */
  fuzzy?: boolean;
  /** Fuzzy tolerance level 0-1 (default: 0.2 = 20% typo tolerance) */
  fuzziness?: number;
  /** Enable prefix matching - "ref" matches "refactoring" (default: true) */
  prefix?: boolean;
  /** How to combine multiple search terms: 'AND' or 'OR' (default: 'AND') */
  combineWith?: 'AND' | 'OR';
}
