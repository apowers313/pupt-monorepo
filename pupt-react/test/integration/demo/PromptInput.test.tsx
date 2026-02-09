/**
 * Integration tests for Demo PromptInput panel
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MantineProvider } from "@mantine/core";
import { PuptProvider, PuptLibraryProvider } from "../../../src";
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
      <PuptLibraryProvider>
        <PuptProvider>
          <DemoProvider>
            <PromptInput />
          </DemoProvider>
        </PuptProvider>
      </PuptLibraryProvider>
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

  it("should render the search input", () => {
    renderWithProviders();
    expect(screen.getByPlaceholderText("Search prompts...")).toBeInTheDocument();
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
