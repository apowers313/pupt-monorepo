import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderPrompt } from "./helpers/prompt-test-utils.mjs";

describe("documentation.prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2025-01-15T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders successfully", async () => {
    const result = await renderPrompt("documentation.prompt", {
      content: "export function fetchUser(id: string): Promise<User> {}",
      docType: "api",
    });
    expect(result.ok).toBe(true);
  });

  it("contains structural sections", async () => {
    const result = await renderPrompt("documentation.prompt", {
      content: "export function fetchUser(id: string): Promise<User> {}",
      docType: "api",
    });
    expect(result.text).toContain("<role>");
    expect(result.text).toContain("<objective>");
    expect(result.text).toContain("<task>");
    expect(result.text).toContain("<contexts>");
  });

  it("interpolates input values", async () => {
    const result = await renderPrompt("documentation.prompt", {
      content: "UNIQUE_CONTENT_MARKER_789",
      docType: "readme",
    });
    expect(result.text).toContain("UNIQUE_CONTENT_MARKER_789");
  });

  it("matches snapshot", async () => {
    const result = await renderPrompt("documentation.prompt", {
      content: "export function fetchUser(id: string): Promise<User> {}",
      docType: "api",
    });
    expect(result.text).toMatchSnapshot();
  });
});
