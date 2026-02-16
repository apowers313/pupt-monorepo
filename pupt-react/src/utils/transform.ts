/**
 * Utility functions for prompt transformation and rendering
 */

import {
    CHILDREN,
    createInputIterator,
    createPromptFromSource,
    type InputRequirement,
    isPuptElement,
    type PuptElement,
} from "@pupt/lib";

/**
 * Options for transformSource function
 */
export interface TransformOptions {
    /** Filename for error messages (default: "prompt.tsx") */
    filename?: string;
}

/**
 * Transform source code string into a PuptElement.
 * Delegates to pupt-lib's createPromptFromSource.
 *
 * @param source - TSX/JSX source code (should export default a PuptElement)
 * @param options - Transform options including filename
 * @returns Promise resolving to the transformed PuptElement
 */
export async function transformSource(source: string, options: TransformOptions = {}): Promise<PuptElement> {
    const { filename = "prompt.tsx" } = options;
    return createPromptFromSource(source, filename);
}

/**
 * Options for extractInputRequirements
 */
export interface ExtractOptions {
    /** Pre-supply values to skip during iteration */
    values?: Record<string, unknown>;
}

/**
 * Extract input requirements from a PuptElement by traversing its tree
 * and finding Ask components.
 *
 * Uses createInputIterator with validation disabled, submitting placeholder
 * values to advance through all requirements.
 *
 * @param element - The PuptElement to extract requirements from
 * @param options - Optional configuration including pre-supplied values
 * @returns Array of InputRequirement objects
 */
export async function extractInputRequirements(
    element: PuptElement,
    options?: ExtractOptions,
): Promise<InputRequirement[]> {
    try {
        const iteratorOpts: Parameters<typeof createInputIterator>[1] = {
            validateOnSubmit: false,
            environment: "browser",
        };
        if (options?.values) {
            iteratorOpts.values = options.values;
        }
        const iterator = createInputIterator(element, iteratorOpts);

        const requirements: InputRequirement[] = [];

        // start() is async - must await
        await iterator.start();

        while (!iterator.isDone()) {
            const current = iterator.current();
            if (current) {
                requirements.push(current);
                // Submit a placeholder value to advance (validation is disabled)
                await iterator.submit(undefined);
            }
            // advance() is async - must await
            await iterator.advance();
        }

        return requirements;
    } catch {
        // If input iterator fails, return empty array
        // This can happen if the element has no Ask components
        return [];
    }
}

/**
 * Check if a PuptElement type represents an Ask component
 */
export function isAskComponent(type: string | symbol): boolean {
    if (typeof type === "string") {
        return type.startsWith("Ask.") || type === "Ask";
    }
    return false;
}

/**
 * Recursively traverse a PuptElement tree and call a visitor function
 * for each element.
 */
export function traverseElement(element: PuptElement, visitor: (element: PuptElement) => void): void {
    visitor(element);

    // Use CHILDREN symbol to access children (pupt-lib uses symbol keys)
    const children = element[CHILDREN];
    if (children) {
        if (Array.isArray(children)) {
            for (const child of children) {
                if (isElement(child)) {
                    traverseElement(child, visitor);
                }
            }
        } else if (isElement(children)) {
            traverseElement(children as PuptElement, visitor);
        }
    }
}

/**
 * Type guard to check if a value is a PuptElement
 */
export function isElement(value: unknown): value is PuptElement {
    return isPuptElement(value);
}
