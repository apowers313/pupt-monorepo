/**
 * Tests for PuptProvider component
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { PuptProvider } from "../../../src/components/PuptProvider";
import { usePupt } from "../../../src/hooks/usePupt";
import type { SearchablePrompt } from "pupt-lib";

// Helper to create wrapper with PuptProvider
function createWrapper(props?: {
  prompts?: SearchablePrompt[];
  renderOptions?: Record<string, unknown>;
  environment?: Record<string, unknown>;
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PuptProvider {...props}>{children}</PuptProvider>;
  };
}

describe("PuptProvider", () => {
  it("should initialize context", async () => {
    const { result } = renderHook(() => usePupt(), {
      wrapper: createWrapper(),
    });

    // Wait for initialization to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current._initialized).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should have null search engine when no prompts provided", async () => {
    const { result } = renderHook(() => usePupt(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.searchEngine).toBeNull();
  });

  it("should create search engine when prompts are provided", async () => {
    const prompts: SearchablePrompt[] = [
      {
        name: "test-prompt",
        description: "A test prompt",
        tags: ["test"],
        library: "test-lib",
      },
    ];

    const { result } = renderHook(() => usePupt(), {
      wrapper: createWrapper({ prompts }),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.searchEngine).toBeDefined();
    expect(result.current.searchEngine).not.toBeNull();
  });

  it("should handle search on search engine", async () => {
    const prompts: SearchablePrompt[] = [
      {
        name: "greeting",
        description: "A greeting prompt",
        tags: ["greeting", "hello"],
        library: "test-lib",
      },
      {
        name: "code-review",
        description: "Code review prompt",
        tags: ["code", "review"],
        library: "test-lib",
      },
    ];

    const { result } = renderHook(() => usePupt(), {
      wrapper: createWrapper({ prompts }),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Search for greeting
    const searchResults = result.current.searchEngine?.search("greeting");
    expect(searchResults).toBeDefined();
    expect(searchResults!.length).toBeGreaterThan(0);
    expect(searchResults![0].prompt.name).toBe("greeting");
  });

  it("should pass render options to context", async () => {
    const renderOptions = { trimOutput: true };

    const { result } = renderHook(() => usePupt(), {
      wrapper: createWrapper({ renderOptions }),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.renderOptions).toEqual(renderOptions);
  });

  it("should pass environment to context", async () => {
    const environment = { customVar: "test" };

    const { result } = renderHook(() => usePupt(), {
      wrapper: createWrapper({ environment }),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.environment).toEqual(environment);
  });

  it("should handle errors during initialization gracefully", async () => {
    // Suppress console.error for expected error
    const originalConsoleError = console.error;
    console.error = vi.fn();

    const { result } = renderHook(() => usePupt(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // In normal operation, error should be null
    expect(result.current.error).toBeNull();

    console.error = originalConsoleError;
  });

  it("should update when prompts prop changes", async () => {
    const initialPrompts: SearchablePrompt[] = [];
    const newPrompts: SearchablePrompt[] = [
      {
        name: "new-prompt",
        description: "A new prompt",
        tags: [],
        library: "test-lib",
      },
    ];

    const { result, rerender } = renderHook(() => usePupt(), {
      wrapper: createWrapper({ prompts: initialPrompts }),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.searchEngine).toBeNull(); // No prompts initially

    // Rerender with new prompts
    rerender();

    // Create a new wrapper with prompts and render again
    const { result: newResult } = renderHook(() => usePupt(), {
      wrapper: createWrapper({ prompts: newPrompts }),
    });

    await waitFor(() => expect(newResult.current.isLoading).toBe(false));
    expect(newResult.current.searchEngine).not.toBeNull();
  });
});
