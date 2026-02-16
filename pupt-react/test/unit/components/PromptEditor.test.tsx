/**
 * Tests for PromptEditor headless component
 */

import { act, fireEvent,render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { PromptEditor } from "../../../src/components/PromptEditor";
import { PuptProvider } from "../../../src/components/PuptProvider";
import type { PromptEditorRenderProps } from "../../../src/types/components";

describe("PromptEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render with default value", () => {
    const { getByRole } = render(
      <PuptProvider>
        <PromptEditor defaultValue="<Prompt>Test</Prompt>">
          {({ inputProps }) => <textarea {...inputProps} />}
        </PromptEditor>
      </PuptProvider>
    );

    expect(getByRole("textbox")).toHaveValue("<Prompt>Test</Prompt>");
  });

  it("should render with empty value when no default", () => {
    const { getByRole } = render(
      <PuptProvider>
        <PromptEditor>
          {({ inputProps }) => <textarea {...inputProps} />}
        </PromptEditor>
      </PuptProvider>
    );

    expect(getByRole("textbox")).toHaveValue("");
  });

  it("should call onChange when value changes", () => {
    const onChange = vi.fn();

    const { getByRole } = render(
      <PuptProvider>
        <PromptEditor onChange={onChange}>
          {({ inputProps }) => <textarea {...inputProps} />}
        </PromptEditor>
      </PuptProvider>
    );

    fireEvent.change(getByRole("textbox"), { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("should expose value through render props", () => {
    let capturedProps: PromptEditorRenderProps | null = null;

    const { getByRole } = render(
      <PuptProvider>
        <PromptEditor defaultValue="initial">
          {(props) => {
            capturedProps = props;
            return <textarea {...props.inputProps} />;
          }}
        </PromptEditor>
      </PuptProvider>
    );

    expect(capturedProps!.value).toBe("initial");

    fireEvent.change(getByRole("textbox"), { target: { value: "updated" } });
    expect(capturedProps!.value).toBe("updated");
  });

  it("should expose setValue for programmatic updates", () => {
    let capturedProps: PromptEditorRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptEditor defaultValue="initial">
          {(props) => {
            capturedProps = props;
            return (
              <div>
                <textarea {...props.inputProps} />
                <button onClick={() => props.setValue("programmatic")}>
                  Set
                </button>
              </div>
            );
          }}
        </PromptEditor>
      </PuptProvider>
    );

    expect(capturedProps!.value).toBe("initial");

    // Click set button
    fireEvent.click(capturedProps!.value === "initial" ? document.querySelector("button")! : document.querySelector("button")!);
    expect(capturedProps!.value).toBe("programmatic");
  });

  it("should expose transformation state for valid source", async () => {
    vi.useRealTimers();
    let capturedProps: PromptEditorRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptEditor
          defaultValue={`export default <Prompt name="test"><Task>Hello</Task></Prompt>`}
          debounce={0}
        >
          {(props) => {
            capturedProps = props;
            return <textarea {...props.inputProps} />;
          }}
        </PromptEditor>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.element).not.toBeNull());
    expect(capturedProps!.error).toBeNull();
    expect(capturedProps!.isTransforming).toBe(false);
  });

  it("should expose error state for invalid source", async () => {
    vi.useRealTimers();
    let capturedProps: PromptEditorRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptEditor defaultValue="<InvalidJSX />" debounce={0}>
          {(props) => {
            capturedProps = props;
            return <textarea {...props.inputProps} />;
          }}
        </PromptEditor>
      </PuptProvider>
    );

    await waitFor(() => expect(capturedProps!.error).not.toBeNull());
    expect(capturedProps!.element).toBeNull();
  });

  it("should debounce transformation", async () => {
    let transformCount = 0;
    let capturedProps: PromptEditorRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptEditor defaultValue="" debounce={200}>
          {(props) => {
            if (props.element) {transformCount++;}
            capturedProps = props;
            return <textarea {...props.inputProps} />;
          }}
        </PromptEditor>
      </PuptProvider>
    );

    // Rapid value changes
    act(() => { capturedProps!.setValue("a"); });
    act(() => { capturedProps!.setValue("ab"); });
    act(() => { capturedProps!.setValue("abc"); });

    // No transformation should have happened yet
    expect(capturedProps!.element).toBeNull();

    // Advance past debounce - wrap in act since this triggers async state updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    // The key assertion is that we didn't get multiple transforms for rapid changes
    expect(transformCount).toBeLessThanOrEqual(1);
  });

  it("should handle empty source by clearing element and error", async () => {
    vi.useRealTimers();
    let capturedProps: PromptEditorRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptEditor
          defaultValue={`export default <Prompt name="test"><Task>Hello</Task></Prompt>`}
          debounce={0}
        >
          {(props) => {
            capturedProps = props;
            return <textarea {...props.inputProps} />;
          }}
        </PromptEditor>
      </PuptProvider>
    );

    // Wait for initial transformation
    await waitFor(() => expect(capturedProps!.element).not.toBeNull());

    // Clear the source to empty
    act(() => {
      capturedProps!.setValue("");
    });

    // Should clear element and error, not be transforming
    await waitFor(() => {
      expect(capturedProps!.element).toBeNull();
      expect(capturedProps!.error).toBeNull();
      expect(capturedProps!.isTransforming).toBe(false);
    });
  });

  it("should handle whitespace-only source as empty", async () => {
    vi.useRealTimers();
    let capturedProps: PromptEditorRenderProps | null = null;

    render(
      <PuptProvider>
        <PromptEditor defaultValue="   " debounce={0}>
          {(props) => {
            capturedProps = props;
            return <textarea {...props.inputProps} />;
          }}
        </PromptEditor>
      </PuptProvider>
    );

    // Give it a moment
    await waitFor(() => {
      expect(capturedProps!.element).toBeNull();
      expect(capturedProps!.error).toBeNull();
      expect(capturedProps!.isTransforming).toBe(false);
    });
  });
});
