/**
 * PromptEditor - Headless render-prop component for editing prompt source
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { PuptElement } from "pupt-lib";
import { transformSource } from "../utils/transform";
import type { PromptEditorProps } from "../types/components";

const DEFAULT_DEBOUNCE = 300;

/**
 * Headless component that provides state and props for a prompt source editor.
 *
 * Uses the render-prop pattern to give consumers full control over the UI
 * while managing source value state and transformation.
 *
 * @example
 * ```tsx
 * <PromptEditor defaultValue="<Prompt>Hello</Prompt>">
 *   {({ inputProps, error, isTransforming }) => (
 *     <div>
 *       <textarea {...inputProps} />
 *       {isTransforming && <span>Transforming...</span>}
 *       {error && <span>{error.message}</span>}
 *     </div>
 *   )}
 * </PromptEditor>
 * ```
 */
export function PromptEditor({
  children,
  defaultValue = "",
  onChange,
  debounce = DEFAULT_DEBOUNCE,
}: PromptEditorProps): React.ReactElement {
  const [value, setValueState] = useState(defaultValue);
  const [element, setElement] = useState<PuptElement | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Transform the source after debounce
  const scheduleTransform = useCallback(
    (source: string) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (source.trim() === "") {
        setElement(null);
        setError(null);
        setIsTransforming(false);
        return;
      }

      const doTransform = async () => {
        timerRef.current = null;
        if (!mountedRef.current) return;
        setIsTransforming(true);
        try {
          const result = await transformSource(source);
          if (mountedRef.current) {
            setElement(result);
            setError(null);
          }
        } catch (err) {
          if (mountedRef.current) {
            setElement(null);
            setError(
              err instanceof Error ? err : new Error(String(err))
            );
          }
        } finally {
          if (mountedRef.current) {
            setIsTransforming(false);
          }
        }
      };

      if (debounce <= 0) {
        void doTransform();
      } else {
        setIsTransforming(true);
        timerRef.current = setTimeout(() => {
          void doTransform();
        }, debounce);
      }
    },
    [debounce]
  );

  // Transform initial value
  useEffect(() => {
    if (defaultValue.trim() !== "") {
      scheduleTransform(defaultValue);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const newValue = e.target.value;
      setValueState(newValue);
      onChange?.(newValue);
      scheduleTransform(newValue);
    },
    [onChange, scheduleTransform]
  );

  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
      onChange?.(newValue);
      scheduleTransform(newValue);
    },
    [onChange, scheduleTransform]
  );

  return (
    <>
      {children({
        inputProps: {
          value,
          onChange: handleChange,
        },
        value,
        setValue,
        element,
        error,
        isTransforming,
      })}
    </>
  );
}
