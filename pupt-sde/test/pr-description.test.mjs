import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("pr-description.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("pr-description.prompt", {
      gitDiff: "diff --git a/index.js b/index.js\n+const x = 1;",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("pr-description.prompt", {
      gitDiff: "diff --git a/index.js b/index.js\n+const x = 1;",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<context>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("pr-description.prompt", {
      gitDiff: "UNIQUE_DIFF_MARKER_303",
    });
    expect(result.text).toContain("UNIQUE_DIFF_MARKER_303");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("pr-description.prompt", {
      gitDiff: "diff --git a/index.js b/index.js\n+const x = 1;",
    });
    expect(result.text).toMatchSnapshot();
  });
});
