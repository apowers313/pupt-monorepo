// Module and library types for pupt-lib

import type { ComponentType } from './element';

/**
 * Configuration for a pupt library
 */
export interface PuptConfig {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  prompts?: string[];
  components?: string[];
  dependencies?: Record<string, string>;
}

/**
 * A loaded pupt library
 */
export interface PuptLibrary {
  config: PuptConfig;
  prompts: Map<string, DiscoveredPrompt>;
  components: Map<string, ComponentType>;
  path: string;
}

/**
 * A discovered prompt from a library
 */
export interface DiscoveredPrompt {
  name: string;
  description: string;
  path: string;
  library: string;
  tags: string[];
  inputSchema?: Record<string, unknown>;
  component: ComponentType;
}

/**
 * Result of loading a library
 */
export interface LibraryLoadResult {
  success: boolean;
  library?: PuptLibrary;
  errors?: string[];
}

/**
 * Configuration for initializing the Pupt class
 */
export interface PuptInitConfig {
  modules?: string[];
  searchConfig?: {
    threshold?: number;
    weights?: {
      name?: number;
      description?: number;
      tags?: number;
      content?: number;
    };
    fuzzy?: boolean;
    fuzziness?: number;
  };
}
