/**
 * Tests for PromptRenderer headless component
 */

import { act,render, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { PromptRenderer } from "../../../src/components/PromptRenderer";
import { PuptProvider } from "../../../src/components/PuptProvider";
import type { PromptRendererRenderProps } from "../../../src/types/components";

describe("PromptRenderer", () => {
  it("should render output when ready", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptRenderer
          source={`export default <Prompt name="test"><Task>Hello world</Task></Prompt>`}
          autoRender
        >
          {(props) => {
            capturedProps = props;
            return <pre>{props.output}</pre>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.output).not.toBeNull());
    expect(capturedProps!.isReady).toBe(true);
    expect(capturedProps!.output).toContain("Hello world");
  });

  it("should show loading state during render", async () => {
    let sawLoading = false;

    render(
      <PuptProvider>
        <PromptRenderer
          source={`export default <Prompt name="test"><Task>Test</Task></Prompt>`}
          autoRender
        >
          {(props) => {
            if (props.isLoading) {sawLoading = true;}
            return <div>{props.isLoading ? "Loading..." : "Done"}</div>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(sawLoading).toBe(true));
  });

  it("should expose pending inputs when Ask components present", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptRenderer
          source={`export default (
            <Prompt name="test">
              <Ask.Text name="userName" label="Your name" required />
            </Prompt>
          )`}
        >
          {(props) => {
            capturedProps = props;
            return <div>{props.pendingInputs.length} inputs needed</div>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.pendingInputs.length).toBe(1));
    expect(capturedProps!.pendingInputs[0].name).toBe("userName");
  });

  it("should accept source as a string shorthand", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptRenderer
          source={`export default <Prompt name="test"><Task>Shorthand</Task></Prompt>`}
          autoRender
        >
          {(props) => {
            capturedProps = props;
            return <pre>{props.output}</pre>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.output).not.toBeNull());
    expect(capturedProps!.output).toContain("Shorthand");
  });

  it("should accept source as PromptSource object", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptRenderer
          source={{
            type: "source",
            value: `export default <Prompt name="test"><Task>ObjectSource</Task></Prompt>`,
          }}
          autoRender
        >
          {(props) => {
            capturedProps = props;
            return <pre>{props.output}</pre>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.output).not.toBeNull());
    expect(capturedProps!.output).toContain("ObjectSource");
  });

  it("should expose error state on render failure", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptRenderer source="<InvalidJSX />" autoRender>
          {(props) => {
            capturedProps = props;
            return <div>{props.error?.message ?? "no error"}</div>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.error).not.toBeNull());
  });

  it("should provide clipboard copy functionality", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    // Mock clipboard API using spyOn
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(
      <PuptProvider>
        <PromptRenderer
          source={`export default <Prompt name="test"><Task>Copy me</Task></Prompt>`}
          autoRender
        >
          {(props) => {
            capturedProps = props;
            return <button onClick={props.copyToClipboard}>Copy</button>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.output).not.toBeNull());

    // Click copy - wrap in act to allow state update
    await act(async () => {
      await capturedProps!.copyToClipboard();
    });
    expect(writeTextSpy).toHaveBeenCalledWith(capturedProps!.output);
    expect(capturedProps!.isCopied).toBe(true);

    writeTextSpy.mockRestore();
  });

  it("should handle clipboard API failure gracefully", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    // Mock clipboard API to fail using spyOn
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockRejectedValue(new Error("Clipboard unavailable"));

    render(
      <PuptProvider>
        <PromptRenderer
          source={`export default <Prompt name="test"><Task>Copy me</Task></Prompt>`}
          autoRender
        >
          {(props) => {
            capturedProps = props;
            return <button onClick={props.copyToClipboard}>Copy</button>;
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.output).not.toBeNull());

    // Click copy - should not throw
    await act(async () => {
      await capturedProps!.copyToClipboard();
    });
    // isCopied should remain false since clipboard failed
    expect(capturedProps!.isCopied).toBe(false);

    writeTextSpy.mockRestore();
  });

  it("should provide manual render function", async () => {
    let capturedProps: PromptRendererRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptRenderer
          source={`export default <Prompt name="test"><Task>Manual</Task></Prompt>`}
          autoRender={false}
        >
          {(props) => {
            capturedProps = props;
            return (
              <div>
                <button onClick={props.render}>Render</button>
                <pre>{props.output}</pre>
              </div>
            );
          }}
        </PromptRenderer>
      </PuptProvider>
    );

    // Wait for transformation to complete (autoRender=false so no output yet)
    await waitFor(() => expect(capturedProps!.isLoading).toBe(false));
    // Output should be null since autoRender is false
    // (the hook only auto-renders when autoRender is true)

    // Manually render - wrap in act since render triggers async state updates
    await act(async () => {
      await capturedProps!.render();
    });
    await waitFor(() => expect(capturedProps!.output).not.toBeNull());
    expect(capturedProps!.output).toContain("Manual");
  });
});
