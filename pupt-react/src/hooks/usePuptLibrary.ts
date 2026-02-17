/**
 * usePuptLibrary - Hook wrapping the Pupt class for prompt library management
 */

import {
    type DiscoveredPromptWithMethods,
    type ModuleEntry,
    Pupt,
    type PuptInitConfig,
    type SearchEngineConfig,
} from "@pupt/lib";
import { useCallback, useEffect, useRef, useState } from "react";

import type { UsePuptLibraryOptions, UsePuptLibraryReturn } from "../types/hooks";

/**
 * Hook that wraps the Pupt class with React state management.
 *
 * Creates a Pupt instance, loads modules, and exposes discovered prompts.
 * Re-initializes when the modules list changes.
 *
 * @example
 * ```tsx
 * const { prompts, isLoading, addModule } = usePuptLibrary({
 *   modules: ["@my-org/prompts"],
 * });
 * ```
 */
export function usePuptLibrary(options: UsePuptLibraryOptions = {}): UsePuptLibraryReturn {
    const { modules: initialModules = [], searchConfig } = options;

    const [modules, setModules] = useState<ModuleEntry[]>(initialModules);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [prompts, setPrompts] = useState<DiscoveredPromptWithMethods[]>([]);
    const [tags, setTags] = useState<string[]>([]);

    const puptRef = useRef<Pupt | null>(null);
    const searchConfigRef = useRef<SearchEngineConfig | undefined>(searchConfig);
    searchConfigRef.current = searchConfig;

    // Initialize/re-initialize Pupt when modules change
    useEffect(() => {
        let cancelled = false;

        async function init(): Promise<void> {
            setIsLoading(true);
            setError(null);

            try {
                const config: PuptInitConfig = { modules };
                if (searchConfigRef.current) {
                    config.searchConfig = searchConfigRef.current;
                }
                const pupt = new Pupt(config);
                await pupt.init();

                if (cancelled) {
                    return;
                }

                puptRef.current = pupt;
                setPrompts(pupt.getPrompts());
                setTags(pupt.getTags());
            } catch (err) {
                if (cancelled) {
                    return;
                }
                setError(err instanceof Error ? err : new Error(String(err)));
                setPrompts([]);
                setTags([]);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void init();

        return () => {
            cancelled = true;
        };
    }, [modules]);

    const getPrompt = useCallback(
        (name: string): DiscoveredPromptWithMethods | undefined => {
            return puptRef.current?.getPrompt(name);
        },
        [prompts],
    );

    const getPromptsByTag = useCallback(
        (tag: string): DiscoveredPromptWithMethods[] => {
            return puptRef.current?.getPromptsByTag(tag) ?? [];
        },
        [prompts],
    );

    const addModule = useCallback((source: ModuleEntry): void => {
        setModules((prev) => {
            if (prev.includes(source)) {
                return prev;
            }
            return [...prev, source];
        });
    }, []);

    const removeModule = useCallback((source: ModuleEntry): void => {
        setModules((prev) => prev.filter((m) => m !== source));
    }, []);

    return {
        isLoading,
        error,
        prompts,
        tags,
        getPrompt,
        getPromptsByTag,
        addModule,
        removeModule,
        modules,
    };
}
