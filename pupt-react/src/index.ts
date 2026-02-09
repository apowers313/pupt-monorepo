/**
 * pupt-react - Headless React component library for pupt-lib integration
 *
 * This library provides hooks and render-prop components for:
 * - Prompt searching and transformation
 * - Rendering prompts to text output
 * - User input collection through the Ask system
 */

// Export all types
export * from "./types/index";

// Export context
export { PuptContext, PuptLibraryContext } from "./context";

// Export components
export {
  PuptProvider,
  PuptLibraryProvider,
  PromptEditor,
  PromptRenderer,
  AskHandler,
} from "./components";

// Export hooks
export {
  usePupt,
  usePromptRender,
  useAskIterator,
  usePromptSearch,
  usePostActions,
  useFormula,
  usePuptLibrary,
  usePuptLibraryContext,
} from "./hooks";

// Export utility functions
export {
  transformSource,
  extractInputRequirements,
  isAskComponent,
  traverseElement,
  isElement,
  validateInput,
  createRuntimeConfig,
  evaluateFormula,
} from "./utils";

// Re-export pupt-lib element symbols
export { TYPE, PROPS, CHILDREN, DEFERRED_REF } from "pupt-lib";

// Re-export pupt-lib type guards
export { isPuptElement, isDeferredRef, isComponentClass } from "pupt-lib";

// Re-export pupt-lib Component base class for custom components
export { Component, COMPONENT_MARKER } from "pupt-lib";

// Version constant
export const VERSION = "1.0.0";
