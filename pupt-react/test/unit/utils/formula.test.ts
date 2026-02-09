/**
 * Tests for evaluateFormula re-export
 */

import { describe, it, expect } from "vitest";
import { evaluateFormula } from "../../../src/utils/formula";

describe("evaluateFormula", () => {
  it("should evaluate a simple comparison formula", () => {
    const inputs = new Map<string, unknown>([["count", 10]]);
    expect(evaluateFormula("=count>5", inputs)).toBe(true);
  });

  it("should return false when comparison is not met", () => {
    const inputs = new Map<string, unknown>([["count", 3]]);
    expect(evaluateFormula("=count>5", inputs)).toBe(false);
  });

  it("should be a function", () => {
    expect(typeof evaluateFormula).toBe("function");
  });
});
