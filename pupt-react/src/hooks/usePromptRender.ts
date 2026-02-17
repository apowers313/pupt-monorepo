/**
 * usePromptRender hook - Core hook for transforming and rendering prompts
 */

import {
    createEnvironment,
    type InputRequirement,
    type PostExecutionAction,
    type PuptElement,
    render as renderPrompt,
    type RenderError,
    type RenderOptions,
} from "@pupt/lib";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PromptSource, UsePromptRenderOptions, UsePromptRenderReturn } from "../types/hooks";
import { extractInputRequirements, transformSource } from "../utils/transform";
import { usePupt } from "./usePupt";

/**
 * Hook for transforming JSX/prompt source into rendered text output.
 *
 * Provides functionality to:
 * - Transform source code strings into PuptElement trees
 * - Render elements to text output
 * - Extract input requirements from Ask components
 * - Track loading and error states
 *
 * @param options - Configuration options for the hook
 * @returns Object containing element, output, loading states, and control functions
 *
 * @example
 * ```tsx
 * function PromptDemo() {
 *   const { output, error, isLoading } = usePromptRender({
 *     source: { type: 'source', value: '<Prompt><Task>Hello</Task></Prompt>' },
 *     autoRender: true,
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   return <pre>{output}</pre>;
 * }
 * ```
 */
export function usePromptRender(options: UsePromptRenderOptions = {}): UsePromptRenderReturn {
    const {
        source: initialSource,
        inputs,
        environment,
        renderOptions: customRenderOptions,
        autoRender = false,
        filename,
    } = options;

    // Get context values
    const { renderOptions: contextRenderOptions, environment: contextEnvironment } = usePupt();

    // State
    const [source, setSourceState] = useState<PromptSource | null>(initialSource ?? null);
    const [element, setElement] = useState<PuptElement | null>(null);
    const [output, setOutput] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isTransforming, setIsTransforming] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [inputRequirements, setInputRequirements] = useState<InputRequirement[]>([]);
    const [postActions, setPostActions] = useState<PostExecutionAction[]>([]);
    const [renderErrors, setRenderErrors] = useState<RenderError[]>([]);

    // Ref to track mounted state
    const mountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Transform source code to element
    const doTransform = useCallback(
        async (sourceToTransform: PromptSource): Promise<PuptElement | null> => {
            setIsTransforming(true);
            setError(null);

            try {
                let newElement: PuptElement;

                if (sourceToTransform.type === "element") {
                    // Source is already an element, use directly
                    newElement = sourceToTransform.value;
                } else {
                    // Transform source code to element
                    newElement = await transformSource(sourceToTransform.value, filename ? { filename } : undefined);
                }

                if (mountedRef.current) {
                    setElement(newElement);

                    // Extract input requirements from the element
                    const requirements = await extractInputRequirements(newElement);
                    setInputRequirements(requirements);
                }

                return newElement;
            } catch (err) {
                if (mountedRef.current) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setElement(null);
                    setInputRequirements([]);
                }
                return null;
            } finally {
                if (mountedRef.current) {
                    setIsTransforming(false);
                }
            }
        },
        [filename],
    );

    // Render element to text
    const doRender = useCallback(
        async (elementToRender: PuptElement): Promise<void> => {
            setIsRendering(true);
            setError(null);
            setRenderErrors([]);

            try {
                // Build render options, merging context and custom options
                const mergedOptions: RenderOptions = {
                    ...contextRenderOptions,
                    ...customRenderOptions,
                    inputs: inputs ?? new Map(),
                };

                // Build environment context from partials
                const envOverrides = { ...contextEnvironment, ...environment };
                if (Object.keys(envOverrides).length > 0) {
                    mergedOptions.env = createEnvironment(envOverrides);
                }

                const result = await renderPrompt(elementToRender, mergedOptions);

                if (mountedRef.current) {
                    setOutput(result.text);
                    setPostActions(result.postExecution ?? []);

                    // Check for render errors (result.ok === false means there were errors)
                    if (!result.ok && "errors" in result) {
                        setRenderErrors(result.errors);
                        // Create an error from the first render error for the UI
                        const firstError = result.errors[0];
                        if (firstError) {
                            setError(new Error(`${firstError.component}: ${firstError.message}`));
                        }
                    } else {
                        setRenderErrors([]);
                    }
                }
            } catch (err) {
                if (mountedRef.current) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setOutput(null);
                    setPostActions([]);
                }
            } finally {
                if (mountedRef.current) {
                    setIsRendering(false);
                }
            }
        },
        [contextRenderOptions, contextEnvironment, customRenderOptions, environment, inputs],
    );

    // Public transform function
    const transform = useCallback(
        async (sourceCode?: string): Promise<PuptElement | null> => {
            const sourceToUse = sourceCode ? { type: "source" as const, value: sourceCode } : source;

            if (!sourceToUse) {
                return null;
            }

            if (sourceCode) {
                setSourceState({ type: "source", value: sourceCode });
            }

            return doTransform(sourceToUse);
        },
        [source, doTransform],
    );

    // Public render function
    const render = useCallback(async (): Promise<void> => {
        if (element) {
            await doRender(element);
        }
    }, [element, doRender]);

    // Public setSource function
    const setSource = useCallback((newSource: PromptSource) => {
        setSourceState(newSource);
    }, []);

    // Effect: Sync external source prop to internal state.
    // Track by the string value to avoid infinite loops when callers create a
    // new PromptSource object on every render.
    const externalSourceValue = initialSource?.type === "source" ? initialSource.value : null;
    const prevExternalSourceValue = useRef(externalSourceValue);
    useEffect(() => {
        if (externalSourceValue !== prevExternalSourceValue.current) {
            prevExternalSourceValue.current = externalSourceValue;
            if (initialSource) {
                setSourceState(initialSource);
            }
        }
    }, [externalSourceValue, initialSource]);

    // Effect: Transform when source changes
    useEffect(() => {
        if (source) {
            void doTransform(source);
        } else {
            setElement(null);
            setInputRequirements([]);
            setError(null);
        }
    }, [source, doTransform]);

    // Effect: Auto-render when element changes and autoRender is true
    useEffect(() => {
        if (autoRender && element) {
            void doRender(element);
        }
    }, [autoRender, element, doRender]);

    // Effect: Re-render when inputs change
    useEffect(() => {
        if (autoRender && element && inputs) {
            void doRender(element);
        }
    }, [autoRender, element, inputs, doRender]);

    return {
        source,
        setSource,
        element,
        output,
        error,
        renderErrors,
        isTransforming,
        isRendering,
        isLoading: isTransforming || isRendering,
        inputRequirements,
        postActions,
        render,
        transform,
    };
}
