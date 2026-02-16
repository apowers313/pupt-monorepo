/**
 * Tests for usePostActions hook
 */

import type { PostExecutionAction } from "@pupt/lib";
import { act,renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePostActions } from "../../../src/hooks/usePostActions";

const mockActions: PostExecutionAction[] = [
  { type: "openUrl", url: "https://example.com" },
  { type: "runCommand", command: "echo hello", cwd: "/tmp" },
  { type: "reviewFile", file: "/path/to/file.ts" },
];

describe("usePostActions", () => {
  describe("initialization", () => {
    it("should track pending actions", () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      expect(result.current.pendingActions).toEqual(mockActions);
      expect(result.current.executedActions).toEqual([]);
      expect(result.current.dismissedActions).toEqual([]);
    });

    it("should handle empty actions", () => {
      const { result } = renderHook(() => usePostActions({ actions: [] }));

      expect(result.current.pendingActions).toEqual([]);
      expect(result.current.executedActions).toEqual([]);
      expect(result.current.allDone).toBe(true);
    });

    it("should report allDone as false when actions are pending", () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      expect(result.current.allDone).toBe(false);
    });
  });

  describe("execute", () => {
    it("should execute action and move to executed list", async () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]);
      });

      expect(result.current.executedActions).toContainEqual(mockActions[0]);
      expect(result.current.pendingActions).not.toContainEqual(mockActions[0]);
    });

    it("should use custom handler when provided", async () => {
      const customHandler = vi.fn();
      const { result } = renderHook(() =>
        usePostActions({
          actions: mockActions,
          handlers: { openUrl: customHandler },
        })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]);
      });

      expect(customHandler).toHaveBeenCalledWith(mockActions[0]);
      expect(result.current.executedActions).toContainEqual(mockActions[0]);
    });

    it("should use different handlers for different action types", async () => {
      const openUrlHandler = vi.fn();
      const runCommandHandler = vi.fn();
      const { result } = renderHook(() =>
        usePostActions({
          actions: mockActions,
          handlers: {
            openUrl: openUrlHandler,
            runCommand: runCommandHandler,
          },
        })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]); // openUrl
      });
      expect(openUrlHandler).toHaveBeenCalledWith(mockActions[0]);
      expect(runCommandHandler).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.execute(mockActions[1]); // runCommand
      });
      expect(runCommandHandler).toHaveBeenCalledWith(mockActions[1]);
    });

    it("should not fail when no handler is provided for action type", async () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]);
      });

      // Should still move to executed even without a handler
      expect(result.current.executedActions).toContainEqual(mockActions[0]);
    });

    it("should ignore already-executed actions", async () => {
      const handler = vi.fn();
      const { result } = renderHook(() =>
        usePostActions({
          actions: mockActions,
          handlers: { openUrl: handler },
        })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]);
      });
      await act(async () => {
        await result.current.execute(mockActions[0]);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("dismiss", () => {
    it("should dismiss action without executing", () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      act(() => result.current.dismiss(mockActions[0]));

      expect(result.current.pendingActions).not.toContainEqual(mockActions[0]);
      expect(result.current.executedActions).not.toContainEqual(mockActions[0]);
      expect(result.current.dismissedActions).toContainEqual(mockActions[0]);
    });
  });

  describe("executeAll", () => {
    it("should execute all pending actions", async () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      await act(async () => {
        await result.current.executeAll();
      });

      expect(result.current.pendingActions).toEqual([]);
      expect(result.current.executedActions.length).toBe(mockActions.length);
      expect(result.current.allDone).toBe(true);
    });

    it("should call handlers for each action during executeAll", async () => {
      const openUrlHandler = vi.fn();
      const runCommandHandler = vi.fn();
      const reviewFileHandler = vi.fn();
      const { result } = renderHook(() =>
        usePostActions({
          actions: mockActions,
          handlers: {
            openUrl: openUrlHandler,
            runCommand: runCommandHandler,
            reviewFile: reviewFileHandler,
          },
        })
      );

      await act(async () => {
        await result.current.executeAll();
      });

      expect(openUrlHandler).toHaveBeenCalledTimes(1);
      expect(runCommandHandler).toHaveBeenCalledTimes(1);
      expect(reviewFileHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("dismissAll", () => {
    it("should dismiss all pending actions", () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      act(() => result.current.dismissAll());

      expect(result.current.pendingActions).toEqual([]);
      expect(result.current.executedActions).toEqual([]);
      expect(result.current.dismissedActions.length).toBe(mockActions.length);
      expect(result.current.allDone).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset all actions back to pending", async () => {
      const { result } = renderHook(() =>
        usePostActions({ actions: mockActions })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]);
      });
      act(() => result.current.dismiss(mockActions[1]));

      act(() => result.current.reset());

      expect(result.current.pendingActions).toEqual(mockActions);
      expect(result.current.executedActions).toEqual([]);
      expect(result.current.dismissedActions).toEqual([]);
    });
  });

  describe("actions update", () => {
    it("should update when actions prop changes", () => {
      const { result, rerender } = renderHook(
        (props: { actions: PostExecutionAction[] }) =>
          usePostActions(props),
        { initialProps: { actions: mockActions } }
      );

      expect(result.current.pendingActions.length).toBe(3);

      const newActions: PostExecutionAction[] = [
        { type: "openUrl", url: "https://new.com" },
      ];
      rerender({ actions: newActions });

      expect(result.current.pendingActions).toEqual(newActions);
      expect(result.current.executedActions).toEqual([]);
    });
  });
});
