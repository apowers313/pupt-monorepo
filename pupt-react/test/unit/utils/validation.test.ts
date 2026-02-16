/**
 * Tests for validation utility
 */
import { describe, it, expect } from "vitest";
import { validateInput } from "../../../src/utils/validation";
import type { InputRequirement } from "pupt-lib";

/**
 * Helper to create an InputRequirement with defaults
 */
function createRequirement(
  overrides: Partial<InputRequirement> = {}
): InputRequirement {
  return {
    name: "testField",
    label: "Test Field",
    type: "string",
    required: false,
    ...overrides,
  };
}

describe("validateInput", () => {
  describe("string type validation", () => {
    it("should pass for valid string value", () => {
      const requirement = createRequirement({ type: "string" });
      const result = validateInput(requirement, "hello");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail for non-string value", () => {
      const requirement = createRequirement({ type: "string" });
      const result = validateInput(requirement, 123);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("INVALID_TYPE");
      expect(result.errors[0].message).toContain("Expected a string");
    });

    it("should pass for undefined or null string values", () => {
      const requirement = createRequirement({ type: "string" });
      expect(validateInput(requirement, undefined).valid).toBe(true);
      expect(validateInput(requirement, null).valid).toBe(true);
    });

    it("should fail when string is below min length", () => {
      const requirement = createRequirement({ type: "string", min: 5 });
      const result = validateInput(requirement, "hi");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("TOO_SHORT");
    });

    it("should fail when string exceeds max length", () => {
      const requirement = createRequirement({ type: "string", max: 5 });
      const result = validateInput(requirement, "hello world");
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("TOO_LONG");
      expect(result.errors[0].message).toContain("at most 5 characters");
    });
  });

  describe("secret type validation", () => {
    it("should pass for valid secret string", () => {
      const requirement = createRequirement({ type: "secret" });
      const result = validateInput(requirement, "my-secret");
      expect(result.valid).toBe(true);
    });

    it("should fail for non-string secret value", () => {
      const requirement = createRequirement({ type: "secret" });
      const result = validateInput(requirement, { key: "value" });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_TYPE");
    });

    it("should fail when secret exceeds max length", () => {
      const requirement = createRequirement({ type: "secret", max: 10 });
      const result = validateInput(requirement, "this-is-a-very-long-secret");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("TOO_LONG");
    });
  });

  describe("required field validation", () => {
    it("should fail when required field is undefined", () => {
      const requirement = createRequirement({ required: true });
      const result = validateInput(requirement, undefined);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("REQUIRED");
      expect(result.errors[0].message).toContain("Test Field is required");
    });

    it("should fail when required field is null", () => {
      const requirement = createRequirement({ required: true });
      const result = validateInput(requirement, null);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("REQUIRED");
    });

    it("should fail when required field is empty string", () => {
      const requirement = createRequirement({ required: true });
      const result = validateInput(requirement, "");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("REQUIRED");
    });

    it("should use field name if label not provided", () => {
      const requirement = createRequirement({
        required: true,
        label: undefined,
      });
      const result = validateInput(requirement, undefined);
      expect(result.errors[0].message).toContain("testField is required");
    });

    it("should pass when required field has value", () => {
      const requirement = createRequirement({ required: true });
      const result = validateInput(requirement, "value");
      expect(result.valid).toBe(true);
    });
  });

  describe("number type validation", () => {
    it("should pass for valid number", () => {
      const requirement = createRequirement({ type: "number" });
      const result = validateInput(requirement, 42);
      expect(result.valid).toBe(true);
    });

    it("should fail for NaN", () => {
      const requirement = createRequirement({ type: "number" });
      const result = validateInput(requirement, NaN);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_TYPE");
    });

    it("should fail when number is below min", () => {
      const requirement = createRequirement({ type: "number", min: 10 });
      const result = validateInput(requirement, 5);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("BELOW_MIN");
      expect(result.errors[0].message).toContain("below minimum 10");
    });

    it("should fail when number exceeds max", () => {
      const requirement = createRequirement({ type: "number", max: 100 });
      const result = validateInput(requirement, 150);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("ABOVE_MAX");
      expect(result.errors[0].message).toContain("exceeds maximum 100");
    });

    it("should pass when number is within range", () => {
      const requirement = createRequirement({ type: "number", min: 0, max: 100 });
      const result = validateInput(requirement, 50);
      expect(result.valid).toBe(true);
    });
  });

  describe("boolean type validation", () => {
    it("should pass for boolean values", () => {
      const requirement = createRequirement({ type: "boolean" });
      expect(validateInput(requirement, true).valid).toBe(true);
      expect(validateInput(requirement, false).valid).toBe(true);
    });

    it("should fail for non-boolean values", () => {
      const requirement = createRequirement({ type: "boolean" });
      const result = validateInput(requirement, "true");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_TYPE");
      expect(result.errors[0].message).toContain("Expected a boolean");
    });
  });

  describe("select type validation", () => {
    it("should pass for valid option", () => {
      const requirement = createRequirement({
        type: "select",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      });
      const result = validateInput(requirement, "a");
      expect(result.valid).toBe(true);
    });

    it("should fail for invalid option", () => {
      const requirement = createRequirement({
        type: "select",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      });
      const result = validateInput(requirement, "c");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_OPTION");
      expect(result.errors[0].message).toContain("Valid options: a, b");
    });
  });

  describe("multiselect type validation", () => {
    it("should pass for array values", () => {
      const requirement = createRequirement({ type: "multiselect" });
      const result = validateInput(requirement, ["a", "b"]);
      expect(result.valid).toBe(true);
    });

    it("should fail for non-array values", () => {
      const requirement = createRequirement({ type: "multiselect" });
      const result = validateInput(requirement, "a");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_TYPE");
      expect(result.errors[0].message).toContain("Expected an array");
    });
  });
});
