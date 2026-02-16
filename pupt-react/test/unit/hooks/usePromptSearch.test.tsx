/**
 * Tests for usePromptSearch hook
 */

import type { SearchablePrompt } from "@pupt/lib";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { PuptProvider } from "../../../src/components/PuptProvider";
import { usePromptSearch } from "../../../src/hooks/usePromptSearch";

const searchablePrompts: SearchablePrompt[] = [
  {
    name: "greeting",
    description: "A greeting prompt that says hello",
    tags: ["simple", "hello"],
    library: "test-lib",
    content: "<Prompt>Say hello</Prompt>",
  },
  {
    name: "code-review",
    description: "Review code for quality and issues",
    tags: ["dev", "code"],
    library: "test-lib",
    content: "<Prompt>Review code</Prompt>",
  },
  {
    name: "summarize",
    description: "Summarize text content",
    tags: ["simple", "text"],
    library: "test-lib",
    content: "<Prompt>Summarize this</Prompt>",
  },
];

function createWrapper(prompts: SearchablePrompt[] = searchablePrompts) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <PuptProvider prompts={prompts}>{children}</PuptProvider>;
  };
}

describe("usePromptSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should return empty results initially", () => {
      const { result } = renderHook(() => usePromptSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.query).toBe("");
      expect(result.current.isSearching).toBe(false);
    });

    it("should work without a provider search engine", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PuptProvider>{children}</PuptProvider>
      );

      const { result } = renderHook(() => usePromptSearch(), {
        wrapper,
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.query).toBe("");
    });
  });

  describe("searching", () => {
    it("should search prompts by name", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => usePromptSearch({ debounce: 0 }), {
        wrapper: createWrapper(),
      });

      act(() => result.current.setQuery("greeting"));

      await waitFor(() =>
        expect(result.current.results.length).toBeGreaterThan(0)
      );
      expect(result.current.results[0].prompt.name).toBe("greeting");
    });

    it("should search prompts by description", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => usePromptSearch({ debounce: 0 }), {
        wrapper: createWrapper(),
      });

      act(() => result.current.setQuery("review code"));

      await waitFor(() =>
        expect(result.current.results.length).toBeGreaterThan(0)
      );
      expect(result.current.results[0].prompt.name).toBe("code-review");
    });

    it("should update query state immediately", () => {
      const { result } = renderHook(() => usePromptSearch(), {
        wrapper: createWrapper(),
      });

      act(() => result.current.setQuery("test"));
      expect(result.current.query).toBe("test");
    });

    it("should return empty results for no matches", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => usePromptSearch({ debounce: 0 }), {
        wrapper: createWrapper(),
      });

      act(() => result.current.setQuery("zzzznonexistent"));

      await waitFor(() =>
        expect(result.current.isSearching).toBe(false)
      );
      expect(result.current.results).toEqual([]);
    });

    it("should return empty results for empty query", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => usePromptSearch({ debounce: 0 }), {
        wrapper: createWrapper(),
      });

      act(() => result.current.setQuery("greeting"));
      await waitFor(() =>
        expect(result.current.results.length).toBeGreaterThan(0)
      );

      act(() => result.current.setQuery(""));
      await waitFor(() => expect(result.current.results).toEqual([]));
    });
  });

  describe("debouncing", () => {
    it("should debounce search queries", async () => {
      const { result } = renderHook(
        () => usePromptSearch({ debounce: 100 }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.setQuery("g");
        result.current.setQuery("gr");
        result.current.setQuery("gre");
        result.current.setQuery("greeting");
      });

      // Before debounce fires, results should still be empty
      expect(result.current.results).toEqual([]);

      // Advance past the debounce timeout
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      // Now results should appear
      expect(result.current.results.length).toBeGreaterThan(0);
      expect(result.current.results[0].prompt.name).toBe("greeting");
    });

    it("should search immediately when debounce is 0", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => usePromptSearch({ debounce: 0 }), {
        wrapper: createWrapper(),
      });

      act(() => result.current.setQuery("greeting"));

      await waitFor(() =>
        expect(result.current.results.length).toBeGreaterThan(0)
      );
    });
  });

  describe("options", () => {
    it("should respect limit option", async () => {
      vi.useRealTimers();
      const { result } = renderHook(
        () => usePromptSearch({ debounce: 0, limit: 1 }),
        { wrapper: createWrapper() }
      );

      // Use a broad search term that matches multiple prompts
      act(() => result.current.setQuery("prompt"));

      await waitFor(() =>
        expect(result.current.results.length).toBeGreaterThan(0)
      );
      expect(result.current.results.length).toBeLessThanOrEqual(1);
    });
  });

  describe("clear", () => {
    it("should clear query and results", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => usePromptSearch({ debounce: 0 }), {
        wrapper: createWrapper(),
      });

      act(() => result.current.setQuery("greeting"));
      await waitFor(() =>
        expect(result.current.results.length).toBeGreaterThan(0)
      );

      act(() => result.current.clear());
      expect(result.current.query).toBe("");
      expect(result.current.results).toEqual([]);
    });
  });

  describe("tags", () => {
    it("should provide all available tags", () => {
      const { result } = renderHook(() => usePromptSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.allTags.length).toBeGreaterThan(0);
      expect(result.current.allTags).toContain("simple");
      expect(result.current.allTags).toContain("dev");
    });

    it("should return empty tags when no search engine", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PuptProvider>{children}</PuptProvider>
      );

      const { result } = renderHook(() => usePromptSearch(), {
        wrapper,
      });

      expect(result.current.allTags).toEqual([]);
    });
  });
});
