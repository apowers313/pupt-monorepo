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
export { AskHandler, PromptEditor, PromptRenderer, PuptLibraryProvider, PuptProvider } from "./components";

// Export hooks
export {
    useAskIterator,
    useFormula,
    usePostActions,
    usePromptRender,
    usePromptSearch,
    usePupt,
    usePuptLibrary,
    usePuptLibraryContext,
} from "./hooks";

// Export utility functions
export {
    createRuntimeConfig,
    evaluateFormula,
    extractInputRequirements,
    isAskComponent,
    isElement,
    transformSource,
    traverseElement,
    validateInput,
} from "./utils";

// Re-export pupt-lib element symbols
export { CHILDREN, DEFERRED_REF, PROPS, TYPE } from "@pupt/lib";

// Re-export pupt-lib type guards
export { isComponentClass, isDeferredRef, isPuptElement } from "@pupt/lib";

// Re-export pupt-lib Component base class for custom components
export { Component, COMPONENT_MARKER } from "@pupt/lib";

// Version constant
export const VERSION = "1.0.0";
