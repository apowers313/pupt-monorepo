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
  LlmProvider,
  OutputConfig,
  CodeConfig,
  UserConfig,
  RuntimeConfig,
  PromptConfig,
  EnvironmentContext,
  RenderContext,
} from './context';

export {
  LLM_PROVIDERS,
  inferProviderFromModel,
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
  promptConfigSchema,
  environmentContextSchema,
} from './context';

// Render types
export type {
  RenderOptions,
  RenderResult,
  RenderSuccess,
  RenderFailure,
  RenderError,
  PostExecutionAction,
  ReviewFileAction,
  OpenUrlAction,
  RunCommandAction,
} from './render';

export { isWarningCode } from './render';

// Input types
export type {
  InputRequirement,
  ValidationResult,
  ValidationError,
} from './input';

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
  ModuleEntry,
  PuptConfig,
  PuptLibrary,
  DiscoveredPrompt,
  LibraryLoadResult,
  PuptInitConfig,
} from './module';

// Prompt source types
export type {
  DiscoveredPromptFile,
  PromptSource,
} from './prompt-source';
export { isPromptSource } from './prompt-source';
