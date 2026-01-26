// Re-export all types from pupt-lib

// Element types
export type {
  PuptNode,
  PuptElement,
  ComponentType,
  RegisterableComponent,
  RegistryComponentType,
} from './element';

// Context types
export type {
  LlmConfig,
  OutputConfig,
  CodeConfig,
  RuntimeConfig,
  EnvironmentContext,
  RenderContext,
} from './context';

export {
  DEFAULT_ENVIRONMENT,
  createEnvironment,
  createRuntimeConfig,
} from './context';

// Render types
export type {
  RenderOptions,
  RenderResult,
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

// Service types (re-exported for convenience)
export type { ComponentRegistry } from '../services/component-registry';
export type { Scope } from '../services/scope';
