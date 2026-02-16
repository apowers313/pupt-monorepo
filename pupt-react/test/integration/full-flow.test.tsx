/**
 * Full Flow Integration Tests
 *
 * End-to-end tests that verify the complete prompt editing and rendering flow
 */

import { MantineProvider } from "@mantine/core";
import { fireEvent,render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach,beforeAll, describe, expect, it, vi } from "vitest";

import { Layout } from "../../demo/src/components/Layout";
import { PromptOutput } from "../../demo/src/components/PromptOutput";
import { DemoProvider } from "../../demo/src/context/DemoContext";
import { EXAMPLES } from "../../demo/src/data/examples";
import { PuptLibraryProvider,PuptProvider } from "../../src";

// Mock Monaco editor since it doesn't work in jsdom
vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    onChange,
    language,
  }: {
    value: string;
    onChange?: (value: string) => void;
    language?: string;
  }) => (
    <textarea
      data-testid="mock-editor"
      data-language={language}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      role="textbox"
    />
  ),
}));

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: mockWriteText,
    readText: vi.fn().mockResolvedValue(""),
  },
});

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

afterEach(() => {
  vi.clearAllMocks();
});

function renderApp() {
  return render(
    <MantineProvider>
      <PuptLibraryProvider>
        <PuptProvider>
          <DemoProvider builtinPromptMeta={new Map()}>
            <Layout />
          </DemoProvider>
        </PuptProvider>
      </PuptLibraryProvider>
    </MantineProvider>
  );
}

function renderOutputOnly() {
  return render(
    <MantineProvider>
      <PuptLibraryProvider>
        <PuptProvider>
          <DemoProvider builtinPromptMeta={new Map()}>
            <PromptOutput />
          </DemoProvider>
        </PuptProvider>
      </PuptLibraryProvider>
    </MantineProvider>
  );
}

/**
 * Wait for the async prompt transform/render cycle to settle.
 * PromptRenderer triggers async effects (transform then render) that update
 * state. Tests must wait for these to complete to avoid act() warnings.
 */
async function waitForPromptRender() {
  await waitFor(() => {
    expect(screen.getByText(/Say hello to the user/)).toBeInTheDocument();
  }, { timeout: 5000 });
}

describe("Full Flow Integration", () => {
  it("should render the complete demo application", async () => {
    renderApp();

    // Verify header
    expect(screen.getByText("JSX Prompt Demo")).toBeInTheDocument();

    // Verify two-column layout
    expect(screen.getByTestId("left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();

    // Verify editor panel
    expect(screen.getByText("Prompt Input")).toBeInTheDocument();
    expect(screen.getByTestId("mock-editor")).toBeInTheDocument();

    // Verify output panel title
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();

    // Verify rendered output container exists
    expect(screen.getByTestId("rendered-output")).toBeInTheDocument();

    await waitForPromptRender();
  });

  it("should render editor with default example content", async () => {
    renderApp();

    // Verify editor renders with default example
    const editor = screen.getByTestId("mock-editor");
    expect(editor.value).toContain("Prompt");
    expect(editor.value).toContain("greeting");

    await waitForPromptRender();
  });

  it("should handle editing prompt source in the editor", async () => {
    renderApp();
    await waitForPromptRender();

    const editor = screen.getByTestId("mock-editor");

    // Enter a new prompt
    const newPrompt = `<Prompt name="test">
  <Task>This is a test task.</Task>
</Prompt>`;

    fireEvent.change(editor, { target: { value: newPrompt } });

    // Verify editor updated
    expect(editor.value).toBe(newPrompt);

    // Wait for async effects from the source change to settle
    await waitFor(() => {
      expect(screen.getByText(/This is a test task/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("should have search input in the input panel", async () => {
    renderApp();

    const searchInput = screen.getByPlaceholderText("Search prompts...");
    expect(searchInput).toBeInTheDocument();

    await waitForPromptRender();
  });
});

describe("Output Panel Integration", () => {
  it("should render output panel with title", async () => {
    renderOutputOnly();
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();
    await waitForPromptRender();
  });

  it("should render output container", async () => {
    renderOutputOnly();
    expect(screen.getByTestId("rendered-output")).toBeInTheDocument();
    await waitForPromptRender();
  });

  it("should render output for the default example", async () => {
    renderOutputOnly();
    // Default example contains "Say hello to the user"
    await waitFor(
      () => {
        const outputText = screen.getByText(/Say hello to the user/);
        expect(outputText).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("should show copy button when output is ready", async () => {
    renderOutputOnly();
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /copy/i })
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("should copy output to clipboard", async () => {
    renderOutputOnly();
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /copy/i })
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const copyButton = screen.getByRole("button", { name: /copy/i });
    copyButton.click();

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
  });
});

describe("Example Prompts Validation", () => {
  it("should have at least one example prompt", () => {
    expect(EXAMPLES.length).toBeGreaterThan(0);
  });

  it("should have valid format for all examples", () => {
    EXAMPLES.forEach((example) => {
      expect(example.source).toBeDefined();
      expect(typeof example.source).toBe("string");
      expect(["jsx", "prompt"]).toContain(example.format);
      // Prompt metadata (name, description) should be in the source itself
      expect(example.source).toMatch(/name="/);
      expect(example.source).toMatch(/description="/);
    });
  });

  it("should have examples that contain Prompt elements", () => {
    EXAMPLES.forEach((example) => {
      // All examples should contain <Prompt at minimum
      expect(example.source).toContain("<Prompt");
    });
  });

  it("should have examples with Ask inputs", () => {
    // At least one example should use Ask inputs
    const examplesWithAsk = EXAMPLES.filter((example) =>
      example.source.includes("Ask.")
    );
    expect(examplesWithAsk.length).toBeGreaterThan(0);
  });

  it("should have both jsx and prompt format examples", () => {
    const jsxExamples = EXAMPLES.filter((e) => e.format === "jsx");
    const promptExamples = EXAMPLES.filter((e) => e.format === "prompt");

    expect(jsxExamples.length).toBeGreaterThan(0);
    expect(promptExamples.length).toBeGreaterThan(0);
  });
});

describe("Layout Structure", () => {
  it("should render settings button in header", async () => {
    renderApp();

    const settingsButton = screen.getByRole("button", { name: /environment settings/i });
    expect(settingsButton).toBeInTheDocument();

    await waitForPromptRender();
  });

  it("should render import library button in header", async () => {
    renderApp();

    const importButton = screen.getByRole("button", { name: /import library/i });
    expect(importButton).toBeInTheDocument();

    await waitForPromptRender();
  });

  it("should render both panels side by side", async () => {
    renderApp();

    const leftPanel = screen.getByTestId("left-panel");
    const rightPanel = screen.getByTestId("right-panel");

    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();

    await waitForPromptRender();
  });

  it("should have proper panel labels", async () => {
    renderApp();

    expect(screen.getByText("Prompt Input")).toBeInTheDocument();
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();

    await waitForPromptRender();
  });
});

describe("Error Handling", () => {
  it("should not crash when rendering invalid prompt source", async () => {
    renderApp();
    await waitForPromptRender();

    const editor = screen.getByTestId("mock-editor");

    // Enter invalid JSX
    fireEvent.change(editor, {
      target: { value: "<InvalidJSX without closing" },
    });

    // App should still be functional - header visible
    expect(screen.getByText("JSX Prompt Demo")).toBeInTheDocument();
    // Editor still visible
    expect(screen.getByTestId("mock-editor")).toBeInTheDocument();
    // Output container still exists
    expect(screen.getByTestId("rendered-output")).toBeInTheDocument();

    // Wait for async error handling to settle
    await waitFor(() => {
      expect(screen.getByText(/Invalid JSX/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("should handle empty input gracefully", async () => {
    renderApp();
    await waitForPromptRender();

    const editor = screen.getByTestId("mock-editor");

    // Clear the editor
    fireEvent.change(editor, { target: { value: "" } });

    // App should still be functional
    expect(screen.getByText("JSX Prompt Demo")).toBeInTheDocument();
    expect(screen.getByTestId("rendered-output")).toBeInTheDocument();

    // Wait for async effects from the source change to settle
    await waitFor(() => {
      expect(screen.queryByText(/Say hello to the user/)).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

describe("Application Stability", () => {
  it("should render without throwing errors", async () => {
    expect(() => renderApp()).not.toThrow();
    await waitForPromptRender();
  });

  it("should cleanup properly between renders", async () => {
    const { unmount } = renderApp();
    await waitForPromptRender();
    expect(() => unmount()).not.toThrow();
  });

  it("should handle multiple rapid editor changes", async () => {
    renderApp();
    await waitForPromptRender();

    const editor = screen.getByTestId("mock-editor");

    // Simulate rapid typing
    for (let i = 0; i < 10; i++) {
      fireEvent.change(editor, { target: { value: `test ${i}` } });
    }

    // App should still be stable
    expect(screen.getByText("JSX Prompt Demo")).toBeInTheDocument();

    // Wait for async effects from the last change to settle
    await waitFor(() => {
      expect(screen.getByText(/test 9/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
