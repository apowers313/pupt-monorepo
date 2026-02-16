/**
 * useAskIterator hook - Iterates through Ask components and collects user input
 */

import { createInputIterator, type InputRequirement, type ValidationResult } from "@pupt/lib";
import { useCallback, useEffect, useRef, useState } from "react";

import type { UseAskIteratorOptions, UseAskIteratorReturn } from "../types/hooks";
import { extractInputRequirements } from "../utils/transform";
import { validateInput } from "../utils/validation";

/**
 * Hook for iterating through Ask components in a PuptElement and collecting
 * validated user input.
 *
 * Provides a wizard-like interface for stepping through input requirements,
 * validating submissions, and navigating back to previous inputs.
 *
 * @param options - Configuration including the element to iterate and callbacks
 * @returns Object containing current state, navigation, and submission functions
 *
 * @example
 * ```tsx
 * function InputCollector({ element }) {
 *   const { current, submit, isDone, inputs } = useAskIterator({ element });
 *
 *   if (isDone) return <div>All inputs collected!</div>;
 *   if (!current) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <label>{current.label}</label>
 *       <input onKeyDown={(e) => {
 *         if (e.key === 'Enter') submit(e.currentTarget.value);
 *       }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAskIterator(options: UseAskIteratorOptions): UseAskIteratorReturn {
    const { element, onComplete, initialValues, preSuppliedValues, onMissingDefault } = options;

    // State
    const [requirements, setRequirements] = useState<InputRequirement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [values, setValues] = useState<Map<string, unknown>>(() => new Map(initialValues));
    const [isLoading, setIsLoading] = useState(false);

    // Ref for onComplete to avoid re-triggering effects on callback change
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    // Track whether onComplete has been called for the current set of values
    const completedRef = useRef(false);

    // Extract requirements when element changes
    useEffect(() => {
        if (!element) {
            setRequirements([]);
            setCurrentIndex(0);
            setValues(new Map(initialValues));
            completedRef.current = false;
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        const extractOpts = preSuppliedValues ? { values: preSuppliedValues } : undefined;
        extractInputRequirements(element, extractOpts).then((reqs) => {
            if (!cancelled) {
                setRequirements(reqs);
                setCurrentIndex(0);
                setValues(new Map(initialValues));
                completedRef.current = false;
                setIsLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [element, initialValues, preSuppliedValues]);

    // Derived state
    const totalInputs = requirements.length;
    const isDone = totalInputs > 0 ? currentIndex >= totalInputs : !isLoading;
    const current: InputRequirement | null = currentIndex < totalInputs ? (requirements[currentIndex] ?? null) : null;

    // Call onComplete when done
    useEffect(() => {
        if (isDone && totalInputs > 0 && !completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current?.(new Map(values));
        }
    }, [isDone, totalInputs, values]);

    // Submit value for current requirement
    const submit = useCallback(
        async (value: unknown): Promise<ValidationResult> => {
            if (!current) {
                return {
                    valid: false,
                    errors: [{ field: "", message: "No current requirement", code: "NO_REQUIREMENT" }],
                    warnings: [],
                };
            }

            const result = validateInput(current, value);

            if (result.valid) {
                setValues((prev) => {
                    const next = new Map(prev);
                    next.set(current.name, value);
                    return next;
                });
                setCurrentIndex((prev) => prev + 1);
            }

            return result;
        },
        [current],
    );

    // Navigate to previous input
    const previous = useCallback(() => {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        completedRef.current = false;
    }, []);

    // Navigate to a specific index
    const goTo = useCallback(
        (index: number) => {
            if (index >= 0 && index < totalInputs) {
                setCurrentIndex(index);
                completedRef.current = false;
            }
        },
        [totalInputs],
    );

    // Reset all state
    const reset = useCallback(() => {
        setCurrentIndex(0);
        setValues(new Map());
        completedRef.current = false;
    }, []);

    // Set a value directly by name
    const setValue = useCallback((name: string, value: unknown) => {
        setValues((prev) => {
            const next = new Map(prev);
            next.set(name, value);
            return next;
        });
    }, []);

    // Get a value by name
    const getValue = useCallback(
        (name: string): unknown => {
            return values.get(name);
        },
        [values],
    );

    // Run all inputs non-interactively using defaults and pre-supplied values
    const runNonInteractive = useCallback(async () => {
        if (!element) {
            return new Map<string, unknown>();
        }
        const iteratorOpts: Parameters<typeof createInputIterator>[1] = {
            validateOnSubmit: false,
            environment: "browser",
            nonInteractive: true,
            onMissingDefault: onMissingDefault ?? "error",
        };
        if (preSuppliedValues) {
            iteratorOpts.values = preSuppliedValues;
        }
        const iterator = createInputIterator(element, iteratorOpts);
        await iterator.start();
        const result = await iterator.runNonInteractive();
        setValues(result);
        setCurrentIndex(requirements.length);
        return result;
    }, [element, preSuppliedValues, onMissingDefault, requirements.length]);

    return {
        requirements,
        current,
        currentIndex,
        totalInputs,
        isDone,
        isLoading,
        inputs: values,
        submit,
        previous,
        goTo,
        reset,
        setValue,
        getValue,
        runNonInteractive,
    };
}
