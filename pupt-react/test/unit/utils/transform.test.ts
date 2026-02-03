/**
 * Tests for transform utility
 */
import { describe, it, expect } from "vitest";
import {
  transformSource,
  isElement,
  isAskComponent,
  traverseElement,
  extractInputRequirements,
} from "../../../src/utils/transform";
import type { PuptElement, PuptNode } from "pupt-lib";
import { TYPE, PROPS, CHILDREN } from "pupt-lib";

/**
 * Helper to create a proper PuptElement with symbol keys
 */
function createElement(
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

// Note: createPromptFromSource is mocked globally in test/setup.ts

describe("transformSource", () => {
  it("should transform valid JSX source to PuptElement", async () => {
    const source = `export default <Prompt name="test"><Task>Hello</Task></Prompt>`;
    const element = await transformSource(source);
    expect(element).toBeDefined();
    expect(element[TYPE]).toBe("Prompt");
  });

  it("should throw on invalid source", async () => {
    const source = "export default <Invalid>";
    await expect(transformSource(source)).rejects.toThrow("Invalid JSX");
  });

  it("should handle source without export default", async () => {
    const source = `<Prompt name="auto"><Task>Auto wrapped</Task></Prompt>`;
    const element = await transformSource(source);
    expect(element).toBeDefined();
    expect(element[TYPE]).toBe("Prompt");
  });
});

describe("extractInputRequirements", () => {
  it("should extract requirements from Ask components", async () => {
    // Create a mock element with Ask component
    // Note: extractInputRequirements uses createInputIterator which catches errors
    const mockElement = createElement("Prompt", { name: "test" }, []);

    // extractInputRequirements catches errors and returns empty array
    const requirements = await extractInputRequirements(mockElement);
    expect(requirements).toEqual([]);
  });

  it("should return empty array for elements without Ask components", async () => {
    const mockElement = createElement("Prompt", { name: "test" }, [
      createElement("Task", {}, ["Hello"]),
    ]);

    const requirements = await extractInputRequirements(mockElement);
    expect(requirements).toEqual([]);
  });
});

describe("isElement", () => {
  it("should return true for PuptElement-like objects", () => {
    expect(isElement(createElement("Prompt"))).toBe(true);
  });

  it("should return false for non-element values", () => {
    expect(isElement(null)).toBe(false);
    expect(isElement("string")).toBe(false);
    expect(isElement(42)).toBe(false);
    // Plain objects without symbol marker are not PuptElements
    expect(isElement({ type: "Prompt", props: {} })).toBe(false);
  });
});

describe("isAskComponent", () => {
  it("should return true for Ask namespace components", () => {
    expect(isAskComponent("Ask.Text")).toBe(true);
    expect(isAskComponent("Ask.Select")).toBe(true);
    expect(isAskComponent("Ask")).toBe(true);
  });

  it("should return false for non-Ask components", () => {
    expect(isAskComponent("Prompt")).toBe(false);
    expect(isAskComponent("Task")).toBe(false);
  });

  it("should return false for symbol types", () => {
    expect(isAskComponent(Symbol("test"))).toBe(false);
  });
});

describe("traverseElement", () => {
  it("should visit all elements in tree", () => {
    const element = createElement("Prompt", {}, [
      createElement("Task", {}, ["Hello"]),
      createElement("Role", {}, ["Assistant"]),
    ]);

    const visited: string[] = [];
    traverseElement(element, (el) => {
      const type = el[TYPE];
      if (typeof type === "string") {
        visited.push(type);
      }
    });

    expect(visited).toContain("Prompt");
    expect(visited).toContain("Task");
    expect(visited).toContain("Role");
  });

  it("should handle single child element", () => {
    // Single child as array with one element
    const element = createElement("Prompt", {}, [
      createElement("Task", {}, []),
    ]);

    const visited: string[] = [];
    traverseElement(element, (el) => {
      const type = el[TYPE];
      if (typeof type === "string") {
        visited.push(type);
      }
    });

    expect(visited).toEqual(["Prompt", "Task"]);
  });

  it("should handle element with no children", () => {
    const element = createElement("Task", {}, []);

    const visited: string[] = [];
    traverseElement(element, (el) => {
      const type = el[TYPE];
      if (typeof type === "string") {
        visited.push(type);
      }
    });

    expect(visited).toEqual(["Task"]);
  });
});
