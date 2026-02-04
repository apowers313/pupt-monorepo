/**
 * Test setup file with React testing utilities
 * Configures the testing environment for React component and hook tests
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import type { PuptElement, PuptNode } from "pupt-lib";

// Define symbol constants for creating mock elements
// Must match the symbols used in pupt-lib
const TYPE = Symbol.for("pupt.type");
const PROPS = Symbol.for("pupt.props");
const CHILDREN = Symbol.for("pupt.children");

/**
 * Helper to create a proper mock PuptElement with symbol keys
 */
function createMockElement(
  type: string,
  props: Record<string, unknown> = {},
  children: PuptNode[] = []
): PuptElement {
  return {
    [TYPE]: type,
    [PROPS]: props,
    [CHILDREN]: children,
  } as PuptElement;
}

// Mock createPromptFromSource globally since blob: URL imports have issues in test environment
// This mock parses source patterns and returns appropriate mock elements
vi.mock("pupt-lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("pupt-lib")>();

  // Helper to extract requirements from mock elements
  function extractRequirementsFromElement(element: PuptElement): Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
  }> {
    const requirements: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
    }> = [];

    function traverse(el: PuptElement) {
      const type = el[TYPE] as string;
      const props = el[PROPS] as Record<string, unknown>;
      const children = el[CHILDREN] as PuptNode[];

      // Check if this is an Ask component
      if (type.startsWith("Ask.")) {
        const askType = type.replace("Ask.", "").toLowerCase();
        requirements.push({
          name: props.name as string,
          label: props.label as string,
          type: askType === "text" ? "string" : askType,
          required: props.required as boolean | undefined,
        });
      }

      // Traverse children
      for (const child of children) {
        if (child && typeof child === "object" && TYPE in child) {
          traverse(child as PuptElement);
        }
      }
    }

    traverse(element);
    return requirements;
  }

  // Create a flexible mock for createInputIterator
  function createMockInputIterator(element: PuptElement) {
    const requirements = extractRequirementsFromElement(element);
    let currentIndex = 0;
    const inputs = new Map<string, unknown>();

    return {
      start: vi.fn(),
      current: vi.fn(() => requirements[currentIndex] || null),
      advance: vi.fn(() => {
        currentIndex++;
      }),
      previous: vi.fn(() => {
        if (currentIndex > 0) currentIndex--;
      }),
      goTo: vi.fn((idx: number) => {
        currentIndex = idx;
      }),
      submit: vi.fn((value: unknown) => {
        const req = requirements[currentIndex];
        if (req) {
          inputs.set(req.name, value);
          // Don't increment here - advance() is called separately
        }
        return Promise.resolve({ valid: true, errors: [] });
      }),
      isDone: vi.fn(() => currentIndex >= requirements.length),
      inputs: vi.fn(() => inputs),
      reset: vi.fn(() => {
        currentIndex = 0;
        inputs.clear();
      }),
      getAllRequirements: vi.fn(() => requirements),
      setValue: vi.fn((name: string, value: unknown) => {
        inputs.set(name, value);
      }),
      getValue: vi.fn((name: string) => inputs.get(name)),
      currentIndex: vi.fn(() => currentIndex),
    };
  }

  // Helper to render mock elements to text
  function renderMockElement(
    element: PuptElement,
    inputs?: Map<string, unknown>
  ): string {
    const type = element[TYPE] as string;
    const props = element[PROPS] as Record<string, unknown>;
    const children = element[CHILDREN] as PuptNode[];

    // Handle Ask components - return placeholder or input value
    if (type.startsWith("Ask.")) {
      const name = props.name as string;
      if (inputs && inputs.has(name)) {
        return String(inputs.get(name));
      }
      return `{${name}}`;
    }

    // Handle text children
    const childText = children
      .map((child) => {
        if (typeof child === "string") return child;
        if (typeof child === "number") return String(child);
        if (child && typeof child === "object" && TYPE in child) {
          return renderMockElement(child as PuptElement, inputs);
        }
        return "";
      })
      .join("");

    // Wrap in tags based on type
    if (type === "Prompt") {
      return childText;
    }
    const tagName = type.toLowerCase().replace(".", "-");
    return `<${tagName}>${childText}</${tagName}>`;
  }

  return {
    ...actual,
    // Mock render to produce text output from mock elements
    render: vi.fn(
      (element: PuptElement, options?: { inputs?: Map<string, unknown> }) => {
        const inputs = options?.inputs;
        const text = renderMockElement(element, inputs);
        return Promise.resolve({ ok: true, text, postExecution: [] });
      }
    ),
    createPromptFromSource: vi.fn((source: string): Promise<PuptElement> => {
      // Parse common patterns in test source code
      if (source.includes("Ask.Text") && source.includes("Ask.Number")) {
        return Promise.resolve(
          createMockElement("Prompt", { name: "test" }, [
            createMockElement(
              "Ask.Text",
              { name: "firstName", label: "First name", required: true },
              []
            ),
            createMockElement(
              "Ask.Text",
              { name: "lastName", label: "Last name" },
              []
            ),
            createMockElement(
              "Ask.Number",
              { name: "age", label: "Your age", min: 0, max: 150 },
              []
            ),
          ])
        );
      }
      if (
        source.includes("Ask.Text") &&
        source.includes("firstName") &&
        source.includes("lastName")
      ) {
        return Promise.resolve(
          createMockElement("Prompt", { name: "test" }, [
            createMockElement(
              "Ask.Text",
              { name: "firstName", label: "First name", required: true },
              []
            ),
            createMockElement(
              "Ask.Text",
              { name: "lastName", label: "Last name" },
              []
            ),
          ])
        );
      }
      if (source.includes("Ask.Text")) {
        // Extract Ask.Text component attributes from source
        const askMatch = source.match(
          /<Ask\.Text\s+name="([^"]+)"\s+label="([^"]+)"[^>]*\/>/
        );
        const name = askMatch ? askMatch[1] : "name";
        const label = askMatch ? askMatch[2] : "Your name";

        // Check if Ask.Text is inside Task (inline)
        const isInlineAsk =
          source.includes("<Task>") && source.includes("Ask.Text");
        if (isInlineAsk) {
          // Extract Task content around Ask.Text
          return Promise.resolve(
            createMockElement("Prompt", { name: "test" }, [
              createMockElement("Task", {}, [
                "Hello ",
                createMockElement("Ask.Text", { name, label }, []),
              ]),
            ])
          );
        }

        return Promise.resolve(
          createMockElement("Prompt", { name: "test" }, [
            createMockElement("Ask.Text", { name, label }, []),
          ])
        );
      }
      if (source.includes("<Invalid") || source.includes("InvalidJSX")) {
        return Promise.reject(new Error("Invalid JSX"));
      }
      // Default mock element - extract task content from source if possible
      const taskMatch = source.match(/<Task>([^<]*)<\/Task>/);
      const taskContent = taskMatch ? taskMatch[1] : "Hello";
      return Promise.resolve(
        createMockElement("Prompt", { name: "test" }, [
          createMockElement("Task", {}, [taskContent]),
        ])
      );
    }),
    createInputIterator: vi.fn((element: PuptElement) =>
      createMockInputIterator(element)
    ),
  };
});

// Cleanup after each test to prevent memory leaks and ensure test isolation
afterEach(() => {
  cleanup();
});
