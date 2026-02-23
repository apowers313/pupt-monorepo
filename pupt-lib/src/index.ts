// Main entry point for pupt-lib

export const VERSION = '0.0.0-development';

// Export symbols for element properties
export { CHILDREN, DEFERRED_REF,PROPS, TYPE } from './types/symbols';

// Export element utilities
export { isDeferredRef,isPuptElement } from './types/element';

// Export types
export type {
  CodeConfig,
  ComponentType,
  DeferredRef,
  DiscoveredPrompt,
  DiscoveredPromptFile,
  EnvironmentContext,
  InputRequirement,
  LibraryLoadResult,
  LlmConfig,
  LlmProvider,
  ModuleEntry,
  OpenUrlAction,
  OutputConfig,
  PostExecutionAction,
  PromptConfig,
  PromptSource,
  PuptConfig,
  PuptElement,
  PuptInitConfig,
  PuptLibrary,
  PuptNode,
  RenderContext,
  RenderError,
  RenderFailure,
  RenderOptions,
  RenderResult,
  RenderSuccess,
  ReviewFileAction,
  RunCommandAction,
  RuntimeConfig,
  SearchablePrompt,
  SearchEngineConfig,
  SearchOptions,
  SearchResult,
  SearchResultMatch,
  UserConfig,
  ValidationError,
  ValidationResult,
} from './types';
export { isPromptSource } from './types';

// Export context utilities
export {
  createEnvironment,
  createRuntimeConfig,
  DEFAULT_ENVIRONMENT,
  ensureRuntimeCacheReady,
  inferProviderFromModel,
  isWarningCode,
  LLM_PROVIDERS,
} from './types';

// Export Component base class
export { Component, COMPONENT_MARKER,isComponentClass } from './component';

// Export render function
export { render } from './render';

// Export utilities
export { findChildrenOfType, isElementOfType,partitionChildren } from './utils/children';
export { wrapWithDelimiter } from './utils/delimiter';
export { followPath } from './utils/path';
// Component preset data (re-exported from components/presets/ for public API)
export type { ProviderAdaptations } from '../components/presets';
export type { RolePresetConfig } from '../components/presets';
export type { TaskPresetConfig } from '../components/presets';
export type { ConstraintPresetConfig } from '../components/presets';
export type { StepsPresetConfig } from '../components/presets';
export {
  CONSTRAINT_PRESETS,
  DEFAULT_CONSTRAINTS,
  EDGE_CASE_PRESETS,
  FALLBACK_PRESETS,
  LANGUAGE_CONVENTIONS,
  PROVIDER_ADAPTATIONS,
  ROLE_PRESETS,
  STANDARD_GUARDRAILS,
  STEPS_PRESETS,
  TASK_PRESETS,
} from '../components/presets';

// Export services
export { evaluateFormula } from './services/formula-parser';
export type { InputIterator, InputIteratorOptions, OnMissingDefaultStrategy } from './services/input-iterator';
export { createInputIterator } from './services/input-iterator';
export type { EvaluateOptions } from './services/module-evaluator';
export { evaluateModule } from './services/module-evaluator';
export type { PreprocessOptions } from './services/preprocessor';
export { isPromptFile,preprocessSource } from './services/preprocessor';
export { Transformer } from './services/transformer';

// Export component discovery (dynamically computed from actual component exports)
export {
  getAskComponents,
  getAskShorthand,
  getBuiltinComponents,
  getStructuralComponents,
} from './services/component-discovery';
import { setComponentExportsThunk } from './services/component-discovery';

// Export module loading services
export type { CompiledPrompt, LoadedLibrary, ParsedPackageSource } from './services/module-loader';
export { ModuleLoader } from './services/module-loader';

// Export prompt sources
export type { GitHubPromptSourceOptions } from './services/prompt-sources';
export { GitHubPromptSource, LocalPromptSource, NpmLocalPromptSource, NpmRegistryPromptSource,parseGitHubSource } from './services/prompt-sources';

// Export browser support utilities
export type {
  CdnOptions,
  CdnProvider,
  Dependency,
  ImportMap,
  PuptLibImportMapOptions,
} from './services/browser-support';
export {
  generateImportMap,
  generateImportMapScript,
  generatePuptLibImportMap,
  generatePuptLibImportMapScript,
  resolveCdn,
  serializeImportMap,
} from './services/browser-support';

// Export built-in components
import * as _allComponentExports from '../components';
export * from '../components';

// Export ask utilities (needed by external Ask-style components)
export { askBaseSchema, attachRequirement } from '../components/ask/utils';

// Export prompt creation
export type { CreatePromptOptions } from './create-prompt';
export { createPrompt,createPromptFromSource } from './create-prompt';

// Export API
export type { DiscoveredPromptWithMethods } from './api';
export { Pupt } from './api';

// Export search engine
export type { SearchEngine } from './services/search-engine';
export { createSearchEngine } from './services/search-engine';

// Export file search engine
export type {
  FileInfo,
  FileSearchEngineConfig,
  FileSearchResult,
} from './services/file-search-engine';
export { createFileSearchEngine, FileSearchEngine, loadNodeModules } from './services/file-search-engine';

// Register component exports for dynamic discovery.
// Uses a thunk (lazy reference) so the namespace object is fully populated
// by the time it's actually accessed at runtime.
setComponentExportsThunk(() => _allComponentExports);
