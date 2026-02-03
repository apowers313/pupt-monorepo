/**
 * Tests for usePromptRender hook
 */

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { usePromptRender } from "../../../src/hooks/usePromptRender";
import { PuptProvider } from "../../../src/components/PuptProvider";
import { TYPE } from "pupt-lib";

// Helper to create wrapper with PuptProvider
function createWrapper() {
  function Wrapper({ children }: { children: ReactNode }) {
    return <PuptProvider>{children}</PuptProvider>;
  }
  return Wrapper;
}

describe("usePromptRender", () => {
  describe("source transformation", () => {
    it("should transform source text to element", async () => {
      const source = `export default <Prompt name="test"><Task>Hello</Task></Prompt>`;
      const { result } = renderHook(
        () => usePromptRender({ source: { type: "source", value: source } }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isTransforming).toBe(false));

      expect(result.current.element).not.toBeNull();
      expect(result.current.element?.[TYPE]).toBe("Prompt");
      expect(result.current.error).toBeNull();
    });

    it("should handle element source directly", async () => {
      const element = {
        type: "Prompt",
        props: { name: "test", children: { type: "Task", props: { children: "Hello" } } },
      };
      const { result } = renderHook(
        () => usePromptRender({ source: { type: "element", value: element } }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isTransforming).toBe(false));

      expect(result.current.element).toBe(element);
      expect(result.current.error).toBeNull();
    });

    it("should handle transformation errors gracefully", async () => {
      const invalidSource = "export default <Prompt><InvalidJSX</Prompt>";
      const { result } = renderHook(
        () =>
          usePromptRender({ source: { type: "source", value: invalidSource } }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isTransforming).toBe(false));

      expect(result.current.error).not.toBeNull();
      expect(result.current.element).toBeNull();
    });

    it("should allow setting source via setSource", async () => {
      const { result } = renderHook(() => usePromptRender({}), {
        wrapper: createWrapper(),
      });

      expect(result.current.source).toBeNull();

      act(() => {
        result.current.setSource({
          type: "source",
          value: `export default <Prompt name="dynamic"><Task>Dynamic</Task></Prompt>`,
        });
      });

      await waitFor(() => expect(result.current.element).not.toBeNull());
      expect(result.current.element?.[TYPE]).toBe("Prompt");
    });
  });

  describe("rendering", () => {
    it("should render element to text output with autoRender", async () => {
      const source = `export default <Prompt name="test"><Task>Say hello</Task></Prompt>`;
      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "source", value: source },
            autoRender: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.output).not.toBeNull());
      expect(result.current.output).toContain("Say hello");
    });

    it("should not auto-render when autoRender is false", async () => {
      const source = `export default <Prompt name="test"><Task>Manual test</Task></Prompt>`;
      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "source", value: source },
            autoRender: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.element).not.toBeNull());

      // Output should still be null since we didn't manually render
      expect(result.current.output).toBeNull();
    });

    it("should expose manual render trigger", async () => {
      const source = `export default <Prompt name="test"><Task>Manual test</Task></Prompt>`;
      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "source", value: source },
            autoRender: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.element).not.toBeNull());

      expect(result.current.output).toBeNull();

      await act(async () => {
        await result.current.render();
      });

      expect(result.current.output).toContain("Manual test");
    });

    it("should expose manual transform trigger", async () => {
      const { result } = renderHook(() => usePromptRender({}), {
        wrapper: createWrapper(),
      });

      expect(result.current.element).toBeNull();

      await act(async () => {
        const element = await result.current.transform(
          `export default <Prompt name="manual"><Task>Test</Task></Prompt>`
        );
        expect(element).not.toBeNull();
        expect(element?.[TYPE]).toBe("Prompt");
      });

      expect(result.current.element).not.toBeNull();
    });
  });

  describe("input requirements", () => {
    it("should extract input requirements from Ask components", async () => {
      const source = `export default (
        <Prompt name="test">
          <Ask.Text name="userName" label="Your name" />
        </Prompt>
      )`;
      const { result } = renderHook(
        () => usePromptRender({ source: { type: "source", value: source } }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isTransforming).toBe(false));

      expect(result.current.inputRequirements.length).toBe(1);
      expect(result.current.inputRequirements[0].name).toBe("userName");
      expect(result.current.inputRequirements[0].label).toBe("Your name");
    });

    it("should re-render when inputs change", async () => {
      // Ask.Text is placed inline where the value should appear
      // Note: label is required by the schema
      const source = `export default (
        <Prompt name="test">
          <Task>Hello <Ask.Text name="name" label="Name" /></Task>
        </Prompt>
      )`;
      const initialInputs = new Map<string, unknown>();

      const { result, rerender } = renderHook(
        ({ inputs }) =>
          usePromptRender({
            source: { type: "source", value: source },
            inputs,
            autoRender: true,
          }),
        {
          wrapper: createWrapper(),
          initialProps: { inputs: initialInputs },
        }
      );

      // Wait for initial render to complete
      await waitFor(() => expect(result.current.output).not.toBeNull());
      await waitFor(() => expect(result.current.isRendering).toBe(false));

      // Initial output should have placeholder
      expect(result.current.output).toContain("{name}");

      const newInputs = new Map<string, unknown>([["name", "Alice"]]);
      rerender({ inputs: newInputs });

      // Wait for re-render to complete with new value
      await waitFor(
        () => expect(result.current.output).toContain("Alice"),
        { timeout: 3000 }
      );
    });
  });

  describe("post actions", () => {
    it("should extract post actions from rendered element", async () => {
      const source = `export default (
        <Prompt name="test">
          <Task>Review this</Task>
          <PostExecution>
            <OpenUrl url="https://example.com" />
          </PostExecution>
        </Prompt>
      )`;
      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "source", value: source },
            autoRender: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.output).not.toBeNull());

      // Post actions are extracted during rendering
      expect(result.current.postActions).toBeDefined();
    });
  });

  describe("loading states", () => {
    it("should track isTransforming state", async () => {
      const source = `export default <Prompt name="test"><Task>Hello</Task></Prompt>`;
      const { result } = renderHook(
        () => usePromptRender({ source: { type: "source", value: source } }),
        { wrapper: createWrapper() }
      );

      // Initially transforming
      expect(result.current.isTransforming).toBe(true);

      await waitFor(() => expect(result.current.isTransforming).toBe(false));
    });

    it("should track isRendering state", async () => {
      const source = `export default <Prompt name="test"><Task>Hello</Task></Prompt>`;
      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "source", value: source },
            autoRender: true,
          }),
        { wrapper: createWrapper() }
      );

      // Wait for output to be available (rendering complete)
      await waitFor(() => expect(result.current.output).not.toBeNull());
      expect(result.current.isRendering).toBe(false);
    });

    it("should track combined isLoading state", async () => {
      const source = `export default <Prompt name="test"><Task>Hello</Task></Prompt>`;
      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "source", value: source },
            autoRender: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // isLoading should be false when both transforming and rendering are done
      expect(result.current.isTransforming).toBe(false);
      expect(result.current.isRendering).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle render errors", async () => {
      // Create an element that might cause a render error
      const element = {
        type: "NonExistentComponent",
        props: { children: "Test" },
      };
      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "element", value: element },
            autoRender: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isRendering).toBe(false));

      // The element should be set but output might be empty or error might be set
      // depending on how pupt-lib handles unknown components
      expect(result.current.element).toBe(element);
    });
  });

  describe("environment and render options", () => {
    it("should accept custom environment context", async () => {
      const source = `export default <Prompt name="test"><Task>Hello</Task></Prompt>`;
      const customEnv = { user: "testuser" };

      const { result } = renderHook(
        () =>
          usePromptRender({
            source: { type: "source", value: source },
            environment: customEnv,
            autoRender: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.output).not.toBeNull());

      // The environment should be passed through (this tests that it doesn't crash)
      expect(result.current.error).toBeNull();
    });
  });
});
