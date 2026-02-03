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
export { PuptContext } from "./context";

// Export components
export {
  PuptProvider,
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
} from "./hooks";

// Version constant
export const VERSION = "1.0.0";
