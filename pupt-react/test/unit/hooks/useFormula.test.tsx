/**
 * Tests for useFormula hook
 */

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect,it } from "vitest";

import { PuptProvider } from "../../../src/components/PuptProvider";
import { useFormula } from "../../../src/hooks/useFormula";

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PuptProvider>{children}</PuptProvider>;
  };
}

describe("useFormula", () => {
  it("should return true for a satisfied comparison", () => {
    const inputs = new Map<string, unknown>([["count", 10]]);
    const { result } = renderHook(
      () => useFormula({ formula: "=count>5", inputs }),
      { wrapper: createWrapper() }
    );

    expect(result.current.result).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should return false for an unsatisfied comparison", () => {
    const inputs = new Map<string, unknown>([["count", 3]]);
    const { result } = renderHook(
      () => useFormula({ formula: "=count>5", inputs }),
      { wrapper: createWrapper() }
    );

    expect(result.current.result).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle AND formula", () => {
    const inputs = new Map<string, unknown>([["a", 2], ["b", 5]]);
    const { result } = renderHook(
      () => useFormula({ formula: "=AND(a>1,b<10)", inputs }),
      { wrapper: createWrapper() }
    );

    expect(result.current.result).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should handle invalid formula with error", () => {
    const inputs = new Map<string, unknown>();
    const { result } = renderHook(
      () => useFormula({ formula: "=invalid", inputs }),
      { wrapper: createWrapper() }
    );

    expect(result.current.result).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe("Invalid formula");
  });

  it("should re-evaluate when inputs change", () => {
    const inputs1 = new Map<string, unknown>([["count", 3]]);
    const inputs2 = new Map<string, unknown>([["count", 10]]);

    const { result, rerender } = renderHook(
      ({ inputs }) => useFormula({ formula: "=count>5", inputs }),
      { wrapper: createWrapper(), initialProps: { inputs: inputs1 } }
    );

    expect(result.current.result).toBe(false);

    rerender({ inputs: inputs2 });
    expect(result.current.result).toBe(true);
  });
});
