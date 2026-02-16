/**
 * Type definitions for pupt-react
 *
 * This module exports all type definitions used throughout the library.
 * Types are organized into categories:
 * - Context types
 * - Hook types
 * - Component types
 */

// Context types
export type { PuptContextValue, PuptProviderProps } from "./context";

// Hook types
export type {
    PostActionHandler,
    PromptSource,
    UseAskIteratorOptions,
    UseAskIteratorReturn,
    UseFormulaOptions,
    UseFormulaReturn,
    UsePostActionsOptions,
    UsePostActionsReturn,
    UsePromptRenderOptions,
    UsePromptRenderReturn,
    UsePromptSearchOptions,
    UsePromptSearchReturn,
    UsePuptLibraryOptions,
    UsePuptLibraryReturn,
} from "./hooks";

// Component types
export type {
    AskHandlerProps,
    AskHandlerRenderProps,
    AskInputProps,
    PromptEditorProps,
    PromptEditorRenderProps,
    PromptRendererProps,
    PromptRendererRenderProps,
} from "./components";

// Re-export useful types from pupt-lib for consumers
export type {
    DeferredRef,
    DiscoveredPromptWithMethods,
    EnvironmentContext,
    InputRequirement,
    OnMissingDefaultStrategy,
    PostExecutionAction,
    PuptElement,
    PuptInitConfig,
    PuptNode,
    RenderOptions,
    RenderResult,
    RuntimeConfig,
    SearchablePrompt,
    SearchEngineConfig,
    SearchOptions,
    SearchResult,
    ValidationResult,
} from "./context";
