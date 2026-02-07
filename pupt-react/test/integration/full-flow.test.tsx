/**
 * Full Flow Integration Tests
 *
 * End-to-end tests that verify the complete prompt editing and rendering flow
 */

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { MantineProvider } from "@mantine/core";
import { PuptProvider } from "../../src/components/PuptProvider";
import { DemoProvider } from "../../demo/src/context/DemoContext";
import { Layout } from "../../demo/src/components/Layout";
import { PromptOutput } from "../../demo/src/components/PromptOutput";
import { EXAMPLES } from "../../demo/src/data/examples";

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
      <PuptProvider>
        <DemoProvider>
          <Layout />
        </DemoProvider>
      </PuptProvider>
    </MantineProvider>
  );
}

function renderOutputOnly() {
  return render(
    <MantineProvider>
      <PuptProvider>
        <DemoProvider>
          <PromptOutput />
        </DemoProvider>
      </PuptProvider>
    </MantineProvider>
  );
}

describe("Full Flow Integration", () => {
  it("should render the complete demo application", () => {
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
  });

  it("should render editor with default example content", () => {
    renderApp();

    // Verify editor renders with default example
    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;
    expect(editor.value).toContain("Prompt");
    expect(editor.value).toContain("greeting");
  });

  it("should handle editing prompt source in the editor", () => {
    renderApp();

    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;

    // Enter a new prompt
    const newPrompt = `<Prompt name="test">
  <Task>This is a test task.</Task>
</Prompt>`;

    fireEvent.change(editor, { target: { value: newPrompt } });

    // Verify editor updated
    expect(editor.value).toBe(newPrompt);
  });

  it("should have examples dropdown in the input panel", () => {
    renderApp();

    const examplesButton = screen.getByRole("button", { name: /examples/i });
    expect(examplesButton).toBeInTheDocument();
    expect(examplesButton).toHaveAttribute("aria-haspopup", "menu");
  });
});

describe("Output Panel Integration", () => {
  it("should render output panel with title", () => {
    renderOutputOnly();
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();
  });

  it("should render output container", () => {
    renderOutputOnly();
    expect(screen.getByTestId("rendered-output")).toBeInTheDocument();
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
      expect(example.name).toBeDefined();
      expect(typeof example.name).toBe("string");
      expect(example.description).toBeDefined();
      expect(typeof example.description).toBe("string");
      expect(example.source).toBeDefined();
      expect(typeof example.source).toBe("string");
      expect(["jsx", "prompt"]).toContain(example.format);
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
  it("should render settings button in header", () => {
    renderApp();

    const settingsButton = screen.getByRole("button", { name: /environment settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it("should render both panels side by side", () => {
    renderApp();

    const leftPanel = screen.getByTestId("left-panel");
    const rightPanel = screen.getByTestId("right-panel");

    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();
  });

  it("should have proper panel labels", () => {
    renderApp();

    expect(screen.getByText("Prompt Input")).toBeInTheDocument();
    expect(screen.getByText("Rendered Output")).toBeInTheDocument();
  });
});

describe("Error Handling", () => {
  it("should not crash when rendering invalid prompt source", () => {
    renderApp();

    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;

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
  });

  it("should handle empty input gracefully", () => {
    renderApp();

    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;

    // Clear the editor
    fireEvent.change(editor, { target: { value: "" } });

    // App should still be functional
    expect(screen.getByText("JSX Prompt Demo")).toBeInTheDocument();
    expect(screen.getByTestId("rendered-output")).toBeInTheDocument();
  });
});

describe("Application Stability", () => {
  it("should render without throwing errors", () => {
    expect(() => renderApp()).not.toThrow();
  });

  it("should cleanup properly between renders", () => {
    const { unmount } = renderApp();
    expect(() => unmount()).not.toThrow();
  });

  it("should handle multiple rapid editor changes", () => {
    renderApp();
    const editor = screen.getByTestId("mock-editor") as HTMLTextAreaElement;

    // Simulate rapid typing
    for (let i = 0; i < 10; i++) {
      fireEvent.change(editor, { target: { value: `test ${i}` } });
    }

    // App should still be stable
    expect(screen.getByText("JSX Prompt Demo")).toBeInTheDocument();
  });
});
