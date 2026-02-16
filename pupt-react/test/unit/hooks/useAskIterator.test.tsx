/**
 * Tests for useAskIterator hook
 */

import type { PuptElement } from "@pupt/lib";
// createPromptFromSource is mocked globally in test/setup.ts
// We need to mock createInputIterator separately for iterator behavior tests
import { createInputIterator } from "@pupt/lib";
import { act,renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { PuptProvider } from "../../../src/components/PuptProvider";
import { useAskIterator } from "../../../src/hooks/useAskIterator";
vi.mocked(createInputIterator);
const mockCreateInputIterator = vi.mocked(createInputIterator);

function createWrapper() {
  function Wrapper({ children }: { children: ReactNode }) {
    return <PuptProvider>{children}</PuptProvider>;
  }
  return Wrapper;
}

// Mock element with Ask components
function createElementWithAsks(): PuptElement {
  return {
    type: "Prompt",
    props: { name: "test" },
    children: [
      { type: "Ask.Text", props: { name: "firstName", label: "First name", required: true }, children: [] },
      { type: "Ask.Text", props: { name: "lastName", label: "Last name" }, children: [] },
      { type: "Ask.Number", props: { name: "age", label: "Your age", min: 0, max: 150 }, children: [] },
    ],
  };
}

function createElementWithOneAsk(): PuptElement {
  return {
    type: "Prompt",
    props: { name: "test" },
    children: [
      { type: "Ask.Text", props: { name: "name", label: "Your name" }, children: [] },
    ],
  };
}

function createElementWithNoAsks(): PuptElement {
  return {
    type: "Prompt",
    props: { name: "test" },
    children: [{ type: "Task", props: {}, children: ["Hello"] }],
  };
}

// Helper to create a mock iterator for tests
// Note: submit() should NOT increment currentIndex because extractInputRequirements
// calls both submit() and advance() - advance() handles the increment
function createMockIterator(
  requirements: { name: string; label: string; type: string }[],
  preSuppliedValues?: Record<string, unknown>
) {
  let currentIndex = 0;
  const inputs = new Map<string, unknown>();

  // Pre-populate with supplied values
  if (preSuppliedValues) {
    for (const [key, value] of Object.entries(preSuppliedValues)) {
      inputs.set(key, value);
    }
  }

  return {
    start: vi.fn(),
    current: vi.fn(() => currentIndex < requirements.length ? {
      name: requirements[currentIndex].name,
      label: requirements[currentIndex].label,
      type: requirements[currentIndex].type,
    } : null),
    advance: vi.fn(() => { currentIndex++; }),
    previous: vi.fn(() => { if (currentIndex > 0) {currentIndex--;} }),
    goTo: vi.fn((index: number) => { currentIndex = Math.max(0, Math.min(index, requirements.length)); }),
    submit: vi.fn((value: unknown) => {
      const req = requirements[currentIndex];
      if (req) {
        // Simple validation for number type
        if (req.type === "number" && typeof value !== "number") {
          return Promise.resolve({ valid: false, errors: ["Expected a number"] });
        }
        inputs.set(req.name, value);
        // Don't increment here - advance() is called separately by extractInputRequirements
      }
      return Promise.resolve({ valid: true, errors: [] });
    }),
    isDone: vi.fn(() => currentIndex >= requirements.length),
    inputs: () => inputs,
    reset: vi.fn(() => { currentIndex = 0; inputs.clear(); }),
    getAllRequirements: vi.fn(() => requirements),
    setValue: vi.fn((name: string, value: unknown) => { inputs.set(name, value); }),
    getValue: vi.fn((name: string) => inputs.get(name)),
    currentIndex: () => currentIndex,
    runNonInteractive: vi.fn(() => {
      const result = new Map<string, unknown>(inputs);
      for (const req of requirements) {
        if (!result.has(req.name)) {
          if (req.type === "number") {
            result.set(req.name, 0);
          } else {
            result.set(req.name, "default");
          }
        }
      }
      return Promise.resolve(result);
    }),
  };
}

describe("useAskIterator", () => {
  beforeEach(() => {
    mockCreateInputIterator.mockReset();
  });

  describe("initialization", () => {
    it("should extract all input requirements from element", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalInputs).toBe(3);
    });

    it("should start at first input requirement", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.current).not.toBeNull();
      expect(result.current.current?.name).toBe("firstName");
    });

    it("should handle null element", () => {
      const { result } = renderHook(
        () => useAskIterator({ element: null }),
        { wrapper: createWrapper() }
      );

      expect(result.current.totalInputs).toBe(0);
      expect(result.current.current).toBeNull();
      expect(result.current.isDone).toBe(true);
    });

    it("should handle element with no Ask components", async () => {
      const mockIterator = createMockIterator([]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithNoAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalInputs).toBe(0);
      expect(result.current.isDone).toBe(true);
    });

    it("should reinitialize when element changes", async () => {
      const mockIterator1 = createMockIterator([
        { name: "name", label: "Your name", type: "string" },
      ]);
      const mockIterator2 = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator
        .mockReturnValueOnce(mockIterator1 as ReturnType<typeof createInputIterator>)
        .mockReturnValueOnce(mockIterator2 as ReturnType<typeof createInputIterator>);

      const element1 = createElementWithOneAsk();
      const element2 = createElementWithAsks();

      const { result, rerender } = renderHook(
        ({ element }) => useAskIterator({ element }),
        { wrapper: createWrapper(), initialProps: { element: element1 } }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalInputs).toBe(1);

      rerender({ element: element2 });

      await waitFor(() => expect(result.current.totalInputs).toBe(3));
    });
  });

  describe("submission", () => {
    it("should advance to next input after valid submission", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.currentIndex).toBe(0);

      await act(async () => {
        const validation = await result.current.submit("John");
        expect(validation.valid).toBe(true);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it("should validate input before accepting", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Navigate to the Number field (age) at index 2
      await act(async () => {
        await result.current.submit("John");
      });
      await act(async () => {
        await result.current.submit("Doe");
      });
      expect(result.current.currentIndex).toBe(2);
      expect(result.current.current?.name).toBe("age");

      // Submit invalid value for number field
      await act(async () => {
        const validation = await result.current.submit("not a number");
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });

      // Should not have advanced
      expect(result.current.currentIndex).toBe(2);
    });
  });

  describe("navigation", () => {
    it("should allow navigation to previous input", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submit("John");
      });
      await act(async () => {
        await result.current.submit("Doe");
      });
      expect(result.current.currentIndex).toBe(2);

      act(() => result.current.previous());
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.current?.name).toBe("lastName");
    });

    it("should not go below index 0", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.currentIndex).toBe(0);

      act(() => result.current.previous());
      expect(result.current.currentIndex).toBe(0);
    });

    it("should allow goTo specific index", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Submit first two to make index 2 reachable
      await act(async () => {
        await result.current.submit("John");
      });
      await act(async () => {
        await result.current.submit("Doe");
      });

      act(() => result.current.goTo(0));
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.current?.name).toBe("firstName");
    });
  });

  describe("completion", () => {
    it("should track isDone when all inputs collected", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isDone).toBe(false);

      await act(async () => {
        await result.current.submit("John");
      });
      await act(async () => {
        await result.current.submit("Doe");
      });
      await act(async () => {
        await result.current.submit(25);
      });

      expect(result.current.isDone).toBe(true);
    });

    it("should call onComplete callback when done", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const onComplete = vi.fn();
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element, onComplete }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submit("John");
      });
      await act(async () => {
        await result.current.submit("Doe");
      });
      await act(async () => {
        await result.current.submit(25);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(expect.any(Map));
      const receivedMap = onComplete.mock.calls[0][0] as Map<string, unknown>;
      expect(receivedMap.get("firstName")).toBe("John");
      expect(receivedMap.get("lastName")).toBe("Doe");
      expect(receivedMap.get("age")).toBe(25);
    });
  });

  describe("direct value access", () => {
    it("should allow direct value setting via setValue", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setValue("firstName", "Direct");
      });

      expect(result.current.getValue("firstName")).toBe("Direct");
    });

    it("should reflect values in inputs map", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submit("John");
      });

      expect(result.current.inputs.get("firstName")).toBe("John");
    });
  });

  describe("reset", () => {
    it("should reset to beginning", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submit("John");
      });
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.inputs.size).toBe(1);

      act(() => result.current.reset());
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.inputs.size).toBe(0);
      expect(result.current.isDone).toBe(false);
    });
  });

  describe("pre-supplied values", () => {
    it("should accept initial values", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const initialValues = new Map<string, unknown>([
        ["firstName", "Pre"],
        ["lastName", "Supplied"],
      ]);

      const { result } = renderHook(
        () => useAskIterator({ element, initialValues }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.getValue("firstName")).toBe("Pre");
      expect(result.current.getValue("lastName")).toBe("Supplied");
    });
  });

  describe("runNonInteractive", () => {
    it("should auto-fill all inputs with defaults", async () => {
      const mockIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
        { name: "age", label: "Your age", type: "number" },
      ]);
      mockCreateInputIterator.mockReturnValue(mockIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let nonInteractiveResult: Map<string, unknown> | undefined;
      await act(async () => {
        nonInteractiveResult = await result.current.runNonInteractive();
      });

      expect(nonInteractiveResult).toBeInstanceOf(Map);
      expect(nonInteractiveResult!.size).toBeGreaterThan(0);
    });

    it("should use preSuppliedValues in runNonInteractive", async () => {
      const preSuppliedValues = { firstName: "Jane" };

      // First mock for extractInputRequirements call
      const extractIterator = createMockIterator([
        { name: "firstName", label: "First name", type: "string" },
        { name: "lastName", label: "Last name", type: "string" },
      ]);
      // Second mock for runNonInteractive call (with pre-supplied values)
      const nonInteractiveIterator = createMockIterator(
        [
          { name: "firstName", label: "First name", type: "string" },
          { name: "lastName", label: "Last name", type: "string" },
        ],
        preSuppliedValues
      );
      mockCreateInputIterator
        .mockReturnValueOnce(extractIterator as ReturnType<typeof createInputIterator>)
        .mockReturnValueOnce(nonInteractiveIterator as ReturnType<typeof createInputIterator>);

      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element, preSuppliedValues }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let nonInteractiveResult: Map<string, unknown> | undefined;
      await act(async () => {
        nonInteractiveResult = await result.current.runNonInteractive();
      });

      expect(nonInteractiveResult).toBeInstanceOf(Map);
      expect(nonInteractiveResult!.get("firstName")).toBe("Jane");
    });

    it("should return empty map when element is null", async () => {
      const { result } = renderHook(
        () => useAskIterator({ element: null }),
        { wrapper: createWrapper() }
      );

      let nonInteractiveResult: Map<string, unknown> | undefined;
      await act(async () => {
        nonInteractiveResult = await result.current.runNonInteractive();
      });

      expect(nonInteractiveResult).toBeInstanceOf(Map);
      expect(nonInteractiveResult!.size).toBe(0);
    });
  });
});
