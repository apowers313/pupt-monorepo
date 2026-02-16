/**
 * Integration tests for Demo Layout
 */

import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeAll,describe, expect, it, vi } from "vitest";

import { Layout } from "../../../demo/src/components/Layout";
import { DemoProvider } from "../../../demo/src/context/DemoContext";
import { PuptLibraryProvider,PuptProvider } from "../../../src";

// Mock Monaco editor since it doesn't work in jsdom
vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value: string }) => (
    <textarea data-testid="mock-editor" value={value} readOnly />
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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MantineProvider>
      <PuptLibraryProvider>
        <PuptProvider>
          <DemoProvider builtinPromptMeta={new Map()}>{ui}</DemoProvider>
        </PuptProvider>
      </PuptLibraryProvider>
    </MantineProvider>
  );
}

/**
 * Wait for the async prompt transform/render cycle to settle.
 */
async function waitForPromptRender() {
  await waitFor(() => {
    expect(screen.getByText(/Say hello to the user/)).toBeInTheDocument();
  }, { timeout: 5000 });
}

describe("Demo Layout", () => {
  it("should render header with title", async () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText("JSX Prompt Demo")).toBeInTheDocument();
    await waitForPromptRender();
  });

  it("should render two-column layout", async () => {
    renderWithProviders(<Layout />);
    expect(screen.getByTestId("left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();
    await waitForPromptRender();
  });

  it("should include settings button in header", async () => {
    renderWithProviders(<Layout />);
    const button = screen.getByRole("button", { name: /environment settings/i });
    expect(button).toBeInTheDocument();
    await waitForPromptRender();
  });

  it("should include import library button in header", async () => {
    renderWithProviders(<Layout />);
    const button = screen.getByRole("button", { name: /import library/i });
    expect(button).toBeInTheDocument();
    await waitForPromptRender();
  });

  it("should render Prompt Input title in left panel", async () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText("Prompt Input")).toBeInTheDocument();
    await waitForPromptRender();
  });

  it("should render Rendered Output title in right panel", async () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();
    await waitForPromptRender();
  });
});
