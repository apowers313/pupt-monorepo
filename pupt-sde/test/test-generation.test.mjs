import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("test-generation.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("test-generation.prompt", {
      codeToTest: "function multiply(a, b) { return a * b; }",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("test-generation.prompt", {
      codeToTest: "function multiply(a, b) { return a * b; }",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<contexts>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("test-generation.prompt", {
      codeToTest: "UNIQUE_TEST_MARKER_707",
    });
    expect(result.text).toContain("UNIQUE_TEST_MARKER_707");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("test-generation.prompt", {
      codeToTest: "function multiply(a, b) { return a * b; }",
    });
    expect(result.text).toMatchSnapshot();
  });
});
