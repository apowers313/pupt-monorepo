import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("code-review.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("code-review.prompt", {
      codeToReview: 'function add(a, b) { return a + b; }',
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("code-review.prompt", {
      codeToReview: 'function add(a, b) { return a + b; }',
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<contexts>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("code-review.prompt", {
      codeToReview: "const UNIQUE_MARKER_XYZ = 42;",
    });
    expect(result.text).toContain("UNIQUE_MARKER_XYZ");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("code-review.prompt", {
      codeToReview: 'function add(a, b) { return a + b; }',
    });
    expect(result.text).toMatchSnapshot();
  });
});
