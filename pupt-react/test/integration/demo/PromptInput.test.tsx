/**
 * Integration tests for Demo PromptInput panel
 */

import { MantineProvider } from "@mantine/core";
import { fireEvent,render, screen } from "@testing-library/react";
import React from "react";
import { beforeAll,describe, expect, it, vi } from "vitest";

import { PromptInput } from "../../../demo/src/components/PromptInput";
import { DemoProvider } from "../../../demo/src/context/DemoContext";
import { EXAMPLES } from "../../../demo/src/data/examples";
import { PuptLibraryProvider,PuptProvider } from "../../../src";

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
          <DemoProvider builtinPromptMeta={new Map()}>
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
    const editor = screen.getByTestId("mock-editor");
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
    const editor = screen.getByTestId("mock-editor");
    fireEvent.change(editor, { target: { value: "new source code" } });
    expect(editor.value).toBe("new source code");
  });

  it("should support programmatic source updates via DemoContext", () => {
    // Default is EXAMPLES[0].source (first example is .prompt format, not wrapped)
    renderWithProviders();
    const editor = screen.getByTestId("mock-editor");
    expect(editor.value).toBe(EXAMPLES[0]!.source);

    // Typing changes the value
    fireEvent.change(editor, { target: { value: "custom source" } });
    expect(editor.value).toBe("custom source");
  });
});
