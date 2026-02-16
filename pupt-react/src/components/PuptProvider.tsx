/**
 * PuptProvider - React context provider for pupt-lib integration
 */

import { createSearchEngine, type SearchEngine } from "@pupt/lib";
import { useMemo, useState } from "react";

import { PuptContext } from "../context/PuptContext";
import type { PuptContextValue, PuptProviderProps } from "../types/context";

/**
 * Provider component that initializes pupt-lib and provides context to children
 *
 * @example
 * ```tsx
 * import { PuptProvider } from '@pupt/react';
 *
 * function App() {
 *   return (
 *     <PuptProvider>
 *       <MyComponent />
 *     </PuptProvider>
 *   );
 * }
 * ```
 *
 * @example
 * With prompts for search:
 * ```tsx
 * const prompts = [
 *   { name: 'greeting', description: 'A greeting prompt', tags: ['hello'] }
 * ];
 *
 * function App() {
 *   return (
 *     <PuptProvider prompts={prompts}>
 *       <MyComponent />
 *     </PuptProvider>
 *   );
 * }
 * ```
 */
export function PuptProvider({
    children,
    prompts,
    searchConfig,
    renderOptions = {},
    environment = {},
}: PuptProviderProps): React.ReactElement {
    const [isLoading] = useState(false);
    const [error] = useState<Error | null>(null);

    // Create search engine if prompts provided
    const searchEngine: SearchEngine | null = useMemo(() => {
        if (!prompts || prompts.length === 0) {
            return null;
        }
        try {
            const engine = createSearchEngine(searchConfig);
            engine.index(prompts);
            return engine;
        } catch (err) {
            console.error("Failed to initialize search engine:", err);
            return null;
        }
    }, [prompts, searchConfig]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue: PuptContextValue = useMemo(
        () => ({
            _initialized: true,
            searchEngine,
            prompts: prompts ?? [],
            renderOptions,
            environment,
            isLoading,
            error,
        }),
        [searchEngine, prompts, renderOptions, environment, isLoading, error],
    );

    return <PuptContext.Provider value={contextValue}>{children}</PuptContext.Provider>;
}
