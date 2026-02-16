/**
 * usePuptLibraryContext - Hook to access PuptLibraryProvider context
 */

import { useContext } from "react";

import { PuptLibraryContext } from "../components/PuptLibraryProvider";
import type { UsePuptLibraryReturn } from "../types/hooks";

/**
 * Hook to access the PuptLibraryProvider context.
 *
 * Must be used within a PuptLibraryProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { prompts, addModule, isLoading } = usePuptLibraryContext();
 *   // ...
 * }
 * ```
 */
export function usePuptLibraryContext(): UsePuptLibraryReturn {
    const ctx = useContext(PuptLibraryContext);
    if (!ctx) {
        throw new Error("usePuptLibraryContext must be used within a PuptLibraryProvider");
    }
    return ctx;
}
