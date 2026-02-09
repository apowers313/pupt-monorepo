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
  LlmProvider,
  OutputConfig,
  CodeConfig,
  UserConfig,
  RuntimeConfig,
  PromptConfig,
  EnvironmentContext,
  RenderContext,
  RenderOptions,
  RenderResult,
  RenderSuccess,
  RenderFailure,
  RenderError,
  PostExecutionAction,
  ReviewFileAction,
  OpenUrlAction,
  RunCommandAction,
  InputRequirement,
  ValidationResult,
  ValidationError,
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
  LLM_PROVIDERS,
  inferProviderFromModel,
  DEFAULT_ENVIRONMENT,
  createEnvironment,
  createRuntimeConfig,
  ensureRuntimeCacheReady,
} from './types';

// Export Component base class
export { Component, isComponentClass, COMPONENT_MARKER } from './component';

// Export render function
export { render } from './render';

// Export utilities
export { wrapWithDelimiter } from './utils/delimiter';
export { findChildrenOfType, partitionChildren, isElementOfType } from './utils/children';
// Component preset data (re-exported from components/presets/ for public API)
export {
  PROVIDER_ADAPTATIONS,
  LANGUAGE_CONVENTIONS,
  ROLE_PRESETS,
  TASK_PRESETS,
  CONSTRAINT_PRESETS,
  STEPS_PRESETS,
  DEFAULT_CONSTRAINTS,
  STANDARD_GUARDRAILS,
  EDGE_CASE_PRESETS,
  FALLBACK_PRESETS,
} from '../components/presets';
export type { ProviderAdaptations } from '../components/presets';
export type { RolePresetConfig } from '../components/presets';
export type { TaskPresetConfig } from '../components/presets';
export type { ConstraintPresetConfig } from '../components/presets';
export type { StepsPresetConfig } from '../components/presets';

// Export services
export { createInputIterator } from './services/input-iterator';
export type { InputIterator, InputIteratorOptions, OnMissingDefaultStrategy } from './services/input-iterator';
export { evaluateFormula } from './services/formula-parser';
export { Transformer } from './services/transformer';
export { evaluateModule } from './services/module-evaluator';
export type { EvaluateOptions } from './services/module-evaluator';
export { preprocessSource, isPromptFile, needsPreprocessing } from './services/preprocessor';
export type { PreprocessOptions } from './services/preprocessor';

// Export component discovery (dynamically computed from actual component exports)
export {
  getBuiltinComponents,
  getAskComponents,
  getAskShorthand,
  getStructuralComponents,
} from './services/component-discovery';
import { setComponentExportsThunk } from './services/component-discovery';

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
import * as _allComponentExports from '../components';
export * from '../components';

// Export ask utilities (needed by external Ask-style components)
export { askBaseSchema, attachRequirement } from '../components/ask/utils';

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

// Register component exports for dynamic discovery.
// Uses a thunk (lazy reference) so the namespace object is fully populated
// by the time it's actually accessed at runtime.
setComponentExportsThunk(() => _allComponentExports);
