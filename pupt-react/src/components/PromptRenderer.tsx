/**
 * PromptRenderer - Headless render-prop component for rendering prompts
 */

import { useState, useCallback, useMemo } from "react";
import { usePromptRender } from "../hooks/usePromptRender";
import type { PromptRendererProps } from "../types/components";
import type { PromptSource } from "../types/hooks";

/**
 * Headless component that renders a prompt and provides the result via render props.
 *
 * Wraps the usePromptRender hook and adds clipboard copy functionality.
 *
 * @example
 * ```tsx
 * <PromptRenderer source="<Prompt><Task>Hello</Task></Prompt>" autoRender>
 *   {({ output, copyToClipboard, isCopied }) => (
 *     <div>
 *       <pre>{output}</pre>
 *       <button onClick={copyToClipboard}>
 *         {isCopied ? 'Copied!' : 'Copy'}
 *       </button>
 *     </div>
 *   )}
 * </PromptRenderer>
 * ```
 */
export function PromptRenderer({
  children,
  source,
  autoRender = true,
  inputs,
  renderOptions,
  environment,
  filename,
}: PromptRendererProps): React.ReactElement {
  const [isCopied, setIsCopied] = useState(false);

  // Normalize source to PromptSource (memoized to prevent unnecessary re-renders)
  const normalizedSource = useMemo<PromptSource>(
    () =>
      typeof source === "string"
        ? { type: "source", value: source }
        : source,
    [source],
  );

  const {
    output,
    error,
    isLoading,
    inputRequirements,
    postActions,
    render: doRender,
  } = usePromptRender({
    source: normalizedSource,
    autoRender,
    ...(inputs !== undefined && { inputs }),
    ...(renderOptions !== undefined && { renderOptions }),
    ...(environment !== undefined && { environment }),
    ...(filename !== undefined && { filename }),
  });

  const isReady = output !== null && inputRequirements.length === 0;

  const copyToClipboard = useCallback(async () => {
    if (output === null) return;
    try {
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      // Reset after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [output]);

  const render = useCallback(async () => {
    await doRender();
  }, [doRender]);

  return (
    <>
      {children({
        output,
        isReady,
        isLoading,
        error,
        pendingInputs: inputRequirements,
        postActions,
        copyToClipboard,
        isCopied,
        render,
      })}
    </>
  );
}
