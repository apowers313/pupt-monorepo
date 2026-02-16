/**
 * PuptContext - React context for pupt-lib integration
 */

import { createContext } from "react";

import type { PuptContextValue } from "../types/context";

/**
 * Default context value when no provider is present
 */
const defaultContextValue: PuptContextValue = {
    _initialized: false,
    searchEngine: null,
    prompts: [],
    renderOptions: {},
    environment: {},
    isLoading: false,
    error: null,
};

/**
 * React context for pupt-lib functionality
 *
 * Provides access to:
 * - SearchEngine for prompt searching
 * - Default render options
 * - Environment context
 *
 * @example
 * ```tsx
 * import { useContext } from 'react';
 * import { PuptContext } from '@pupt/react';
 *
 * function MyComponent() {
 *   const { searchEngine, isLoading, error } = useContext(PuptContext);
 *   // ...
 * }
 * ```
 */
export const PuptContext = createContext<PuptContextValue>(defaultContextValue);

// Set display name for React DevTools
PuptContext.displayName = "PuptContext";
