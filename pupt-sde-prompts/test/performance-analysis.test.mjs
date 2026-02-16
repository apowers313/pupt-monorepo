import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("performance-analysis.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("performance-analysis.prompt", {
      codeToAnalyze: "for (let i = 0; i < arr.length; i++) { arr.includes(i); }",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("performance-analysis.prompt", {
      codeToAnalyze: "for (let i = 0; i < arr.length; i++) { arr.includes(i); }",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<contexts>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("performance-analysis.prompt", {
      codeToAnalyze: "UNIQUE_PERF_MARKER_202",
    });
    expect(result.text).toContain("UNIQUE_PERF_MARKER_202");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("performance-analysis.prompt", {
      codeToAnalyze: "for (let i = 0; i < arr.length; i++) { arr.includes(i); }",
    });
    expect(result.text).toMatchSnapshot();
  });
});
