import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("refactor.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("refactor.prompt", {
      code: "function foo() { var x = 1; var y = 2; return x + y; }",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("refactor.prompt", {
      code: "function foo() { var x = 1; var y = 2; return x + y; }",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<context>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("refactor.prompt", {
      code: "UNIQUE_REFACTOR_MARKER_404",
    });
    expect(result.text).toContain("UNIQUE_REFACTOR_MARKER_404");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("refactor.prompt", {
      code: "function foo() { var x = 1; var y = 2; return x + y; }",
    });
    expect(result.text).toMatchSnapshot();
  });
});
