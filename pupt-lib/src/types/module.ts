// Module and library types for pupt-lib

import type { ComponentType } from './element';
import type { PromptSource } from './prompt-source';

/**
 * A resolved module entry with explicit type and metadata.
 * This is the richer format that tools like `pupt` can produce after
 * installing/tracking libraries, providing explicit source type,
 * version, and prompt directory information.
 */
export interface ResolvedModuleEntry {
  /** Display name for the module */
  name: string;
  /** Explicit source type — avoids heuristic string parsing */
  type: 'git' | 'npm' | 'local' | 'url';
  /** The source identifier (git URL, npm package name, local path, or URL) */
  source: string;
  /** Relative paths to prompt directories within the module (overrides default 'prompts/') */
  promptDirs?: string[];
  /** Version string (semver for npm, commit hash for git, etc.) */
  version?: string;
  /** Git branch name (only used for type: 'git'). Defaults to 'master'. */
  branch?: string;
}

/**
 * Type guard for ResolvedModuleEntry
 */
export function isResolvedModuleEntry(value: unknown): value is ResolvedModuleEntry {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    'source' in value &&
    'name' in value &&
    typeof (value as ResolvedModuleEntry).type === 'string' &&
    typeof (value as ResolvedModuleEntry).source === 'string' &&
    typeof (value as ResolvedModuleEntry).name === 'string' &&
    ['git', 'npm', 'local', 'url'].includes((value as ResolvedModuleEntry).type)
  );
}

/**
 * A module entry can be:
 * - A ResolvedModuleEntry with explicit type, source, and metadata
 * - A PromptSource instance (self-resolving prompt discovery)
 * - A package reference with dynamic source loader and config
 */
export type ModuleEntry =
  | ResolvedModuleEntry
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
