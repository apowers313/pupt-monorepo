// Module and library types for pupt-lib

import type { ComponentType } from './element';
import type { PromptSource } from './prompt-source';

/**
 * A module entry can be:
 * - A string (routed to built-in sources: local path, npm, URL, or GitHub)
 * - A PromptSource instance (self-resolving prompt discovery)
 * - A package reference with dynamic source loader and config
 */
export type ModuleEntry =
  | string
  | PromptSource
  | { source: string; config: Record<string, unknown> };

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
  modules?: ModuleEntry[];
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
