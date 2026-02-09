/**
 * useFormula hook - Reactive formula evaluation
 */

import { useMemo } from "react";
import { evaluateFormula } from "pupt-lib";
import type { UseFormulaOptions, UseFormulaReturn } from "../types/hooks";

/**
 * Hook for evaluating Excel-style formulas reactively against input values.
 *
 * Re-evaluates automatically when the formula string or inputs Map changes.
 *
 * @param options - Formula string and input values
 * @returns Object containing the boolean result and any evaluation error
 *
 * @example
 * ```tsx
 * function ConditionalSection({ inputs }) {
 *   const { result } = useFormula({
 *     formula: "=count>5",
 *     inputs,
 *   });
 *
 *   if (!result) return null;
 *   return <div>Count exceeds threshold!</div>;
 * }
 * ```
 */
export function useFormula(options: UseFormulaOptions): UseFormulaReturn {
  const { formula, inputs } = options;

  return useMemo(() => {
    try {
      return { result: evaluateFormula(formula, inputs), error: null };
    } catch (err) {
      return {
        result: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }, [formula, inputs]);
}
