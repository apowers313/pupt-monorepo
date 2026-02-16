/**
 * Tests for usePupt hook
 */

import type { SearchablePrompt } from "@pupt/lib";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect,it } from "vitest";

import { PuptProvider } from "../../../src/components/PuptProvider";
import { usePupt } from "../../../src/hooks/usePupt";

describe("usePupt", () => {
  it("should throw when used outside provider", () => {
    // Suppress console.error for expected error
    const consoleError = console.error;
    console.error = () => {};

    expect(() => {
      renderHook(() => usePupt());
    }).toThrow("usePupt must be used within a PuptProvider");

    console.error = consoleError;
  });

  it("should return context value when inside provider", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PuptProvider>{children}</PuptProvider>
    );

    const { result } = renderHook(() => usePupt(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current._initialized).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should provide stable context structure across renders", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PuptProvider>{children}</PuptProvider>
    );

    const { result, rerender } = renderHook(() => usePupt(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const firstResult = result.current;

    rerender();

    // Context should have the same structure
    expect(result.current._initialized).toBe(firstResult._initialized);
    expect(result.current.isLoading).toBe(firstResult.isLoading);
    expect(result.current.error).toBe(firstResult.error);
  });

  it("should manage loading state during initialization", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PuptProvider>{children}</PuptProvider>
    );

    const { result } = renderHook(() => usePupt(), { wrapper });

    // Wait for initialization to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // After initialization, loading should be false and provider should be initialized
    expect(result.current._initialized).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should return searchEngine when prompts are provided", async () => {
    const prompts: SearchablePrompt[] = [
      {
        name: "test",
        description: "A test prompt",
        tags: [],
        library: "test-lib",
      },
    ];

    const wrapper = ({ children }: { children: ReactNode }) => (
      <PuptProvider prompts={prompts}>{children}</PuptProvider>
    );

    const { result } = renderHook(() => usePupt(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.searchEngine).not.toBeNull();
  });

  it("should return null searchEngine when no prompts provided", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PuptProvider>{children}</PuptProvider>
    );

    const { result } = renderHook(() => usePupt(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.searchEngine).toBeNull();
  });
});
