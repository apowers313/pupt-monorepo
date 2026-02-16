/**
 * PuptLibraryProvider - Context provider for prompt library management
 */

import { createContext, useMemo } from "react";

import { usePuptLibrary } from "../hooks/usePuptLibrary";
import type { UsePuptLibraryOptions, UsePuptLibraryReturn } from "../types/hooks";

/**
 * Context value for PuptLibraryProvider
 */
export const PuptLibraryContext = createContext<UsePuptLibraryReturn | null>(null);
PuptLibraryContext.displayName = "PuptLibraryContext";

/**
 * Props for PuptLibraryProvider
 */
interface PuptLibraryProviderProps extends UsePuptLibraryOptions {
    children: React.ReactNode;
}

/**
 * Provider component that wraps usePuptLibrary and provides library state via context.
 *
 * @example
 * ```tsx
 * <PuptLibraryProvider modules={["@my-org/prompts"]}>
 *   <MyApp />
 * </PuptLibraryProvider>
 * ```
 */
export function PuptLibraryProvider({ children, modules, searchConfig }: PuptLibraryProviderProps): React.ReactElement {
    const opts: UsePuptLibraryOptions = {};
    if (modules) {
        opts.modules = modules;
    }
    if (searchConfig) {
        opts.searchConfig = searchConfig;
    }
    const library = usePuptLibrary(opts);

    const value = useMemo(
        () => library,
        [library.isLoading, library.error, library.prompts, library.tags, library.modules], // eslint-disable-line react-hooks/exhaustive-deps
    );

    return <PuptLibraryContext.Provider value={value}>{children}</PuptLibraryContext.Provider>;
}
