/**
 * Tests for createRuntimeConfig re-export
 */

import { describe, it, expect } from "vitest";
import { createRuntimeConfig } from "../../../src/utils";

describe("createRuntimeConfig", () => {
  it("should return an object with expected shape", () => {
    const config = createRuntimeConfig();
    expect(config).toBeDefined();
    expect(typeof config).toBe("object");
  });

  it("should include hostname field", () => {
    const config = createRuntimeConfig();
    expect(typeof config.hostname).toBe("string");
  });

  it("should include platform field", () => {
    const config = createRuntimeConfig();
    expect(typeof config.platform).toBe("string");
  });

  it("should include timestamp field", () => {
    const config = createRuntimeConfig();
    expect(typeof config.timestamp).toBe("number");
  });
});
