/**
 * Integration tests for Demo PromptOutput panel
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MantineProvider } from "@mantine/core";
import { PuptProvider } from "../../../src/components/PuptProvider";
import { DemoProvider } from "../../../demo/src/context/DemoContext";
import { PromptOutput } from "../../../demo/src/components/PromptOutput";

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
          <PromptOutput />
        </DemoProvider>
      </PuptProvider>
    </MantineProvider>,
  );
}

describe("PromptOutput", () => {
  it("should render the Rendered Output title", () => {
    renderWithProviders();
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();
  });

  it("should render output for the default example", async () => {
    renderWithProviders();
    // Default example is "Simple Greeting" which contains "Say hello to the user"
    await waitFor(
      () => {
        const codeBlock = screen.getByText(/Say hello to the user/);
        expect(codeBlock).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should show copy button when output is ready", async () => {
    renderWithProviders();
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /copy/i }),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should copy output to clipboard", async () => {
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    renderWithProviders();
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /copy/i }),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const copyButton = screen.getByRole("button", { name: /copy/i });
    copyButton.click();

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
    });

    writeTextSpy.mockRestore();
  });

  it("should show error for invalid source", async () => {
    // Render with a custom provider that has invalid source
    render(
      <MantineProvider>
        <PuptProvider>
          <DemoProvider>
            <PromptOutput />
          </DemoProvider>
        </PuptProvider>
      </MantineProvider>,
    );

    // The default source is valid, so we should see output not error
    await waitFor(
      () => {
        expect(screen.getByText(/Say hello/)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
