/**
 * usePostActions hook - Manage post-execution actions from rendered prompts
 */

import type { PostExecutionAction } from "@pupt/lib";
import { useCallback, useRef, useState } from "react";

import type { UsePostActionsOptions, UsePostActionsReturn } from "../types/hooks";

/**
 * Hook for managing post-execution actions extracted from rendered prompts.
 *
 * Tracks pending, executed, and dismissed actions. Supports custom handlers
 * per action type and bulk operations.
 *
 * @param options - Configuration including actions and optional handlers
 * @returns Object containing action lists and control functions
 *
 * @example
 * ```tsx
 * function PostActions({ actions }) {
 *   const { pendingActions, execute, dismiss, allDone } = usePostActions({
 *     actions,
 *     handlers: {
 *       openUrl: (action) => window.open(action.url),
 *     },
 *   });
 *
 *   if (allDone) return <div>All actions handled!</div>;
 *
 *   return (
 *     <ul>
 *       {pendingActions.map((action, i) => (
 *         <li key={i}>
 *           {action.type}
 *           <button onClick={() => execute(action)}>Execute</button>
 *           <button onClick={() => dismiss(action)}>Dismiss</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function usePostActions(options: UsePostActionsOptions): UsePostActionsReturn {
    const { actions, handlers } = options;

    const [executedSet, setExecutedSet] = useState<Set<PostExecutionAction>>(() => new Set());
    const [dismissedSet, setDismissedSet] = useState<Set<PostExecutionAction>>(() => new Set());

    // Track the previous actions reference to reset state on change
    const prevActionsRef = useRef(actions);
    if (prevActionsRef.current !== actions) {
        prevActionsRef.current = actions;
        // Reset state when actions change - this is intentional synchronous state
        // update during render (React supports this pattern for derived state)
        setExecutedSet(new Set());
        setDismissedSet(new Set());
    }

    const pendingActions = actions.filter((a) => !executedSet.has(a) && !dismissedSet.has(a));
    const executedActions = actions.filter((a) => executedSet.has(a));
    const dismissedActions = actions.filter((a) => dismissedSet.has(a));
    const allDone = pendingActions.length === 0;

    const execute = useCallback(
        async (action: PostExecutionAction) => {
            // Skip already-executed actions
            if (executedSet.has(action)) {
                return;
            }

            const handler = handlers?.[action.type];
            if (handler) {
                await handler(action);
            }

            setExecutedSet((prev) => {
                const next = new Set(prev);
                next.add(action);
                return next;
            });
        },
        [handlers, executedSet],
    );

    const dismiss = useCallback((action: PostExecutionAction) => {
        setDismissedSet((prev) => {
            const next = new Set(prev);
            next.add(action);
            return next;
        });
    }, []);

    const executeAll = useCallback(async () => {
        for (const action of pendingActions) {
            const handler = handlers?.[action.type];
            if (handler) {
                await handler(action);
            }
        }

        setExecutedSet((prev) => {
            const next = new Set(prev);
            for (const action of pendingActions) {
                next.add(action);
            }
            return next;
        });
    }, [pendingActions, handlers]);

    const dismissAll = useCallback(() => {
        setDismissedSet((prev) => {
            const next = new Set(prev);
            for (const action of pendingActions) {
                next.add(action);
            }
            return next;
        });
    }, [pendingActions]);

    const reset = useCallback(() => {
        setExecutedSet(new Set());
        setDismissedSet(new Set());
    }, []);

    return {
        pendingActions,
        executedActions,
        dismissedActions,
        allDone,
        execute,
        dismiss,
        executeAll,
        dismissAll,
        reset,
    };
}
