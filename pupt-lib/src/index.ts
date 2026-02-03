// Main entry point for pupt-lib

export const VERSION = '0.0.0-development';

// Export symbols for element properties
export { TYPE, PROPS, CHILDREN, DEFERRED_REF } from './types/symbols';

// Export element utilities
export { isPuptElement, isDeferredRef } from './types/element';

// Export types
export type {
  PuptNode,
  PuptElement,
  ComponentType,
  DeferredRef,
  LlmConfig,
  OutputConfig,
  CodeConfig,
  UserConfig,
  RuntimeConfig,
  EnvironmentContext,
  RenderContext,
  RenderOptions,
  RenderResult,
  RenderSuccess,
  RenderFailure,
  RenderError,
  RenderMetadata,
  PostExecutionAction,
  InputRequirement,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CollectedInputs,
  ComponentProps,
  PromptProps,
  StructuralProps,
  CommonProps,
  SearchablePrompt,
  SearchOptions,
  SearchResult,
  SearchResultMatch,
  SearchEngineConfig,
  PuptConfig,
  PuptLibrary,
  DiscoveredPrompt,
  LibraryLoadResult,
  PuptInitConfig,
} from './types';

// Export context utilities
export {
  DEFAULT_ENVIRONMENT,
  createEnvironment,
  createRuntimeConfig,
  ensureRuntimeCacheReady,
} from './types';

// Export Component base class
export { Component, isComponentClass, COMPONENT_MARKER } from './component';

// Export render function
export { render } from './render';

// Export services
export { createInputIterator } from './services/input-iterator';
export type { InputIterator, InputIteratorOptions, OnMissingDefaultStrategy } from './services/input-iterator';
export { evaluateFormula } from './services/formula-parser';
export { Transformer } from './services/transformer';
export { evaluateModule } from './services/module-evaluator';
export type { EvaluateOptions } from './services/module-evaluator';
export { preprocessSource, isPromptFile, needsPreprocessing, BUILTIN_COMPONENTS } from './services/preprocessor';
export type { PreprocessOptions } from './services/preprocessor';

// Export module loading services
export { ModuleLoader } from './services/module-loader';
export type { SourceType, LoadedLibrary, ParsedPackageSource } from './services/module-loader';

// Export browser support utilities
export {
  resolveCdn,
  generateImportMap,
  serializeImportMap,
  generateImportMapScript,
  generatePuptLibImportMap,
  generatePuptLibImportMapScript,
} from './services/browser-support';
export type {
  CdnProvider,
  CdnOptions,
  Dependency,
  ImportMap,
  PuptLibImportMapOptions,
} from './services/browser-support';

// Export built-in components
export * from './components';

// Export prompt creation
export { createPromptFromSource, createPrompt } from './create-prompt';
export type { CreatePromptOptions } from './create-prompt';

// Export API
export { Pupt } from './api';
export type { DiscoveredPromptWithMethods } from './api';

// Export search engine
export { createSearchEngine } from './services/search-engine';
export type { SearchEngine } from './services/search-engine';

// Export file search engine
export { FileSearchEngine, createFileSearchEngine } from './services/file-search-engine';
export type {
  FileInfo,
  FileSearchResult,
  FileSearchEngineConfig,
} from './services/file-search-engine';
