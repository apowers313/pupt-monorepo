/**
 * Smoke tests to verify testing infrastructure is working correctly
 */

import { describe, it, expect } from "vitest";

describe("smoke test", () => {
  it("should run tests", () => {
    expect(true).toBe(true);
  });

  it("should import React", async () => {
    const React = await import("react");
    expect(React).toBeDefined();
  });

  it("should import pupt-react library", async () => {
    const puptReact = await import("../../src/index");
    expect(puptReact).toBeDefined();
  });
});
