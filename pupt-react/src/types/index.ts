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
  PromptSource,
  UsePromptRenderOptions,
  UsePromptRenderReturn,
  UseAskIteratorOptions,
  UseAskIteratorReturn,
  UsePromptSearchOptions,
  UsePromptSearchReturn,
  PostActionHandler,
  UsePostActionsOptions,
  UsePostActionsReturn,
} from "./hooks";

// Component types
export type {
  PromptEditorRenderProps,
  PromptEditorProps,
  PromptRendererRenderProps,
  PromptRendererProps,
  AskInputProps,
  AskHandlerRenderProps,
  AskHandlerProps,
} from "./components";

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
} from "./context";
