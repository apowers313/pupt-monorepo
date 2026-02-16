import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("debug-root-cause.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("debug-root-cause.prompt", {
      bugDescription: "Application crashes on login with null pointer exception",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("debug-root-cause.prompt", {
      bugDescription: "Application crashes on login with null pointer exception",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<contexts>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("debug-root-cause.prompt", {
      bugDescription: "UNIQUE_BUG_MARKER_123",
    });
    expect(result.text).toContain("UNIQUE_BUG_MARKER_123");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("debug-root-cause.prompt", {
      bugDescription: "Application crashes on login with null pointer exception",
    });
    expect(result.text).toMatchSnapshot();
  });
});
