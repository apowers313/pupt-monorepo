/**
 * Context type definitions for pupt-react
 */

import type {
  SearchEngine,
  SearchablePrompt,
  RenderOptions,
  EnvironmentContext,
} from "pupt-lib";

// Re-export useful types from pupt-lib for consumers
export type {
  SearchablePrompt,
  SearchResult,
  SearchOptions,
  InputRequirement,
  ValidationResult,
  RenderResult,
  RenderOptions,
  PuptElement,
  EnvironmentContext,
  PostExecutionAction,
} from "pupt-lib";

/**
 * Value provided by PuptContext
 */
export interface PuptContextValue {
  /** Internal marker indicating provider is present (not exposed to consumers) */
  _initialized: boolean;

  /** Search engine for finding prompts (null if no prompts provided) */
  searchEngine: SearchEngine | null;

  /** Default render options */
  renderOptions: Partial<RenderOptions>;

  /** Environment context */
  environment: Partial<EnvironmentContext>;

  /** Loading state during initialization */
  isLoading: boolean;

  /** Error state if initialization failed */
  error: Error | null;
}

/**
 * Props for PuptProvider component
 */
export interface PuptProviderProps {
  /** Child components */
  children: React.ReactNode;

  /** Initial prompts to index for search */
  prompts?: SearchablePrompt[];

  /** Default render options to use for all renders */
  renderOptions?: Partial<RenderOptions>;

  /** Environment context */
  environment?: Partial<EnvironmentContext>;
}
