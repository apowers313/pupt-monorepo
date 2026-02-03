/**
 * Integration tests for Demo Layout
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MantineProvider } from "@mantine/core";
import { PuptProvider } from "../../../src/components/PuptProvider";
import { DemoProvider } from "../../../demo/src/context/DemoContext";
import { Layout } from "../../../demo/src/components/Layout";

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
      <PuptProvider>
        <DemoProvider>{ui}</DemoProvider>
      </PuptProvider>
    </MantineProvider>
  );
}

describe("Demo Layout", () => {
  it("should render header with title", () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText("pupt-react Demo")).toBeInTheDocument();
  });

  it("should render two-column layout", () => {
    renderWithProviders(<Layout />);
    expect(screen.getByTestId("left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();
  });

  it("should include GitHub link in header", () => {
    renderWithProviders(<Layout />);
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("github.com")
    );
  });

  it("should render Prompt Input title in left panel", () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText("Prompt Input")).toBeInTheDocument();
  });

  it("should render Rendered Output title in right panel", () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();
  });
});
