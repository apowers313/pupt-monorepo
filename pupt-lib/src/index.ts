// Main entry point for pupt-lib

export const VERSION = '0.0.0-development';

// Export types
export type {
  PuptNode,
  PuptElement,
  ComponentType,
  LlmConfig,
  OutputConfig,
  CodeConfig,
  RuntimeConfig,
  EnvironmentContext,
  RenderContext,
  RenderOptions,
  RenderResult,
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
} from './types';

// Export Component base class
export { Component, isComponentClass, COMPONENT_MARKER } from './component';

// Export render function
export { render } from './render';

// Export services
export { createRegistry, defaultRegistry } from './services/component-registry';
export type { ComponentRegistry } from './services/component-registry';
export { Scope, createScope } from './services/scope';
export { createInputIterator } from './services/input-iterator';
export type { InputIterator, InputIteratorOptions } from './services/input-iterator';
export { evaluateFormula } from './services/formula-parser';

// Export module loading services
export { ModuleLoader } from './services/module-loader';
export type { SourceType, LoadedLibrary, ParsedPackageSource } from './services/module-loader';
export { ScopeLoader, createScopeLoader } from './services/scope-loader';

// Export browser support utilities
export {
  resolveCdn,
  generateImportMap,
  serializeImportMap,
  generateImportMapScript,
} from './services/browser-support';
export type {
  CdnProvider,
  CdnOptions,
  Dependency,
  ImportMap,
} from './services/browser-support';

// Export built-in components (also registers them with defaultRegistry)
export * from './components';

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
