/**
 * usePupt - Hook for accessing pupt-lib context
 */

import { useContext } from "react";
import { PuptContext } from "../context/PuptContext";
import type { PuptContextValue } from "../types/context";

/**
 * Hook to access the pupt-lib context
 *
 * Must be used within a PuptProvider component.
 * Throws an error if used outside of provider.
 *
 * @returns The pupt context value containing searchEngine, renderOptions, etc.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { searchEngine, isLoading, error } = usePupt();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   // Use searchEngine for finding prompts...
 * }
 * ```
 *
 * @throws {Error} When used outside of PuptProvider
 */
export function usePupt(): PuptContextValue {
  const context = useContext(PuptContext);

  // Check if we're outside a provider using the internal _initialized marker
  if (!context._initialized) {
    throw new Error("usePupt must be used within a PuptProvider");
  }

  return context;
}
