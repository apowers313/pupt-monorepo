/**
 * Tests for PuptContext
 */

import { renderHook } from "@testing-library/react";
import { useContext } from "react";
import { describe, expect,it } from "vitest";

import { PuptContext } from "../../../src/context/PuptContext";

describe("PuptContext", () => {
  it("should create context with default values", () => {
    const { result } = renderHook(() => useContext(PuptContext));
    expect(result.current).toBeDefined();
    expect(result.current._initialized).toBe(false);
    expect(result.current.searchEngine).toBeNull();
    expect(result.current.renderOptions).toEqual({});
    expect(result.current.environment).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should have a display name for React DevTools", () => {
    expect(PuptContext.displayName).toBe("PuptContext");
  });
});
