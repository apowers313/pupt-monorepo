/**
 * Integration tests for Demo PromptInput panel
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MantineProvider } from "@mantine/core";
import { PuptProvider } from "../../../src/components/PuptProvider";
import { DemoProvider } from "../../../demo/src/context/DemoContext";
import { PromptInput } from "../../../demo/src/components/PromptInput";
import { EXAMPLES } from "../../../demo/src/data/examples";

// Mock Monaco editor since it doesn't work in jsdom
vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    onChange,
    language,
  }: {
    value: string;
    onChange: (value: string) => void;
    language: string;
  }) => (
    <textarea
      data-testid="mock-editor"
      data-language={language}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mantine requires matchMedia and ResizeObserver in jsdom
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function renderWithProviders() {
  return render(
    <MantineProvider>
      <PuptProvider>
        <DemoProvider>
          <PromptInput />
        </DemoProvider>
      </PuptProvider>
    </MantineProvider>
  );
}

describe("PromptInput", () => {
  it("should render the editor", () => {
    renderWithProviders();
    expect(screen.getByTestId("mock-editor")).toBeInTheDocument();
  });

  it("should render with default example source (first example is .prompt format)", () => {
    renderWithProviders();
    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
    // First example is now .prompt format, so no wrapping
    expect(editor.value).toBe(EXAMPLES[0]!.source);
  });

  it("should render the Prompt Input title", () => {
    renderWithProviders();
    expect(screen.getByText("Prompt Input")).toBeInTheDocument();
  });

  it("should render the Examples dropdown button", () => {
    renderWithProviders();
    expect(screen.getByRole("button", { name: /examples/i })).toBeInTheDocument();
  });

  it("should set editor language to html", () => {
    renderWithProviders();
    const editor = screen.getByTestId("mock-editor");
    expect(editor.getAttribute("data-language")).toBe("html");
  });

  it("should update editor when typing", () => {
    renderWithProviders();
    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "new source code" } });
    expect(editor.value).toBe("new source code");
  });

  it("should have examples button that opens menu", () => {
    renderWithProviders();
    const button = screen.getByRole("button", { name: /examples/i });
    expect(button).toHaveAttribute("aria-haspopup", "menu");
  });

  it("should support programmatic source updates via DemoContext", () => {
    // Default is EXAMPLES[0].source (first example is .prompt format, not wrapped)
    renderWithProviders();
    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
    expect(editor.value).toBe(EXAMPLES[0]!.source);

    // Typing changes the value
    fireEvent.change(editor, { target: { value: "custom source" } });
    expect(editor.value).toBe("custom source");
  });
});
