/**
 * Unit tests for usePuptLibrary hook
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect,it } from "vitest";

import { PuptLibraryProvider } from "../../../src/components/PuptLibraryProvider";
import { usePuptLibrary } from "../../../src/hooks/usePuptLibrary";
import { usePuptLibraryContext } from "../../../src/hooks/usePuptLibraryContext";

describe("usePuptLibrary", () => {
  it("should start with loading state when modules provided", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["test-module"] })
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.prompts).toEqual([]);

    // Wait for init to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should not be loading when no modules provided", async () => {
    const { result } = renderHook(() => usePuptLibrary());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.prompts).toEqual([]);
    expect(result.current.modules).toEqual([]);
  });

  it("should discover prompts from modules", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["my-lib"] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prompts).toHaveLength(2);
    expect(result.current.prompts[0]!.name).toBe("my-lib-prompt-1");
    expect(result.current.prompts[1]!.name).toBe("my-lib-prompt-2");
  });

  it("should expose tags from discovered prompts", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["my-lib"] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tags).toContain("example");
    expect(result.current.tags).toContain("utility");
  });

  it("should get a prompt by name", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["my-lib"] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const prompt = result.current.getPrompt("my-lib-prompt-1");
    expect(prompt).toBeDefined();
    expect(prompt!.name).toBe("my-lib-prompt-1");

    const missing = result.current.getPrompt("nonexistent");
    expect(missing).toBeUndefined();
  });

  it("should get prompts by tag", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["my-lib"] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const examples = result.current.getPromptsByTag("example");
    expect(examples).toHaveLength(1);
    expect(examples[0]!.name).toBe("my-lib-prompt-1");
  });

  it("should add a module dynamically", async () => {
    const { result } = renderHook(() => usePuptLibrary());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.modules).toEqual([]);

    await act(async () => {
      await result.current.addModule("new-module");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.modules).toContain("new-module");
    });

    expect(result.current.prompts).toHaveLength(2);
  });

  it("should not add duplicate modules", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["existing"] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addModule("existing");
    });

    expect(result.current.modules).toEqual(["existing"]);
  });

  it("should remove a module", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["mod-a", "mod-b"] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prompts).toHaveLength(4);

    act(() => {
      result.current.removeModule("mod-a");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.modules).toEqual(["mod-b"]);
    });

    expect(result.current.prompts).toHaveLength(2);
  });

  it("should expose current modules list", async () => {
    const { result } = renderHook(() =>
      usePuptLibrary({ modules: ["a", "b"] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.modules).toEqual(["a", "b"]);
  });
});

describe("PuptLibraryProvider + usePuptLibraryContext", () => {
  it("should provide library context to children", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PuptLibraryProvider modules={["ctx-mod"]}>
        {children}
      </PuptLibraryProvider>
    );

    const { result } = renderHook(() => usePuptLibraryContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prompts).toHaveLength(2);
    expect(result.current.modules).toEqual(["ctx-mod"]);
  });

  it("should throw when used outside provider", () => {
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => usePuptLibraryContext());
    }).toThrow("usePuptLibraryContext must be used within a PuptLibraryProvider");

    spy.mockRestore();
  });
});
