// Re-export all types from pupt-lib

// Symbols for element properties
export { TYPE, PROPS, CHILDREN, DEFERRED_REF } from './symbols';

// Element types
export type {
  PuptNode,
  PuptElement,
  ComponentType,
  DeferredRef,
} from './element';

export { isPuptElement, isDeferredRef } from './element';

// Context types
export type {
  LlmConfig,
  OutputConfig,
  CodeConfig,
  UserConfig,
  RuntimeConfig,
  EnvironmentContext,
  RenderContext,
} from './context';

export {
  DEFAULT_ENVIRONMENT,
  createEnvironment,
  createRuntimeConfig,
  ensureRuntimeCacheReady,
  // Zod schemas for validation
  llmConfigSchema,
  outputConfigSchema,
  codeConfigSchema,
  userConfigSchema,
  runtimeConfigSchema,
  environmentContextSchema,
} from './context';

// Render types
export type {
  RenderOptions,
  RenderResult,
  RenderSuccess,
  RenderFailure,
  RenderError,
  RenderMetadata,
  PostExecutionAction,
  ReviewFileAction,
  OpenUrlAction,
  RunCommandAction,
} from './render';

// Input types
export type {
  InputRequirement,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CollectedInputs,
} from './input';

// Component types
export type {
  ComponentProps,
  PromptProps,
  StructuralProps,
  CommonProps,
} from './component';

// Search types
export type {
  SearchablePrompt,
  SearchOptions,
  SearchResult,
  SearchResultMatch,
  SearchEngineConfig,
} from './search';

// Module types
export type {
  PuptConfig,
  PuptLibrary,
  DiscoveredPrompt,
  LibraryLoadResult,
  PuptInitConfig,
} from './module';
