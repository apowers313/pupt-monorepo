import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("implementation-plan.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("implementation-plan.prompt", {
      input: "Add user authentication with JWT tokens",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("implementation-plan.prompt", {
      input: "Add user authentication with JWT tokens",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<contexts>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("implementation-plan.prompt", {
      input: "UNIQUE_PLAN_MARKER_101",
    });
    expect(result.text).toContain("UNIQUE_PLAN_MARKER_101");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("implementation-plan.prompt", {
      input: "Add user authentication with JWT tokens",
    });
    expect(result.text).toMatchSnapshot();
  });
});
