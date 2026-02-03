/**
 * Input validation utilities for Ask components
 */

import type {
  InputRequirement,
  ValidationResult,
  ValidationError,
} from "pupt-lib";

/**
 * Validate a value against an InputRequirement's constraints.
 *
 * @param requirement - The input requirement to validate against
 * @param value - The value to validate
 * @returns A ValidationResult indicating success or failure
 */
export function validateInput(
  requirement: InputRequirement,
  value: unknown
): ValidationResult {
  const errors: ValidationError[] = [];

  // Type-specific validation
  switch (requirement.type) {
    case "number":
      if (typeof value !== "number" || isNaN(value)) {
        errors.push({
          field: requirement.name,
          message: `Expected a number, got ${typeof value}`,
          code: "INVALID_TYPE",
        });
      } else {
        if (requirement.min !== undefined && value < requirement.min) {
          errors.push({
            field: requirement.name,
            message: `Value ${value} is below minimum ${requirement.min}`,
            code: "BELOW_MIN",
          });
        }
        if (requirement.max !== undefined && value > requirement.max) {
          errors.push({
            field: requirement.name,
            message: `Value ${value} exceeds maximum ${requirement.max}`,
            code: "ABOVE_MAX",
          });
        }
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        errors.push({
          field: requirement.name,
          message: `Expected a boolean, got ${typeof value}`,
          code: "INVALID_TYPE",
        });
      }
      break;

    case "select":
      if (requirement.options && requirement.options.length > 0) {
        const validValues = requirement.options.map((o) => o.value);
        if (!validValues.includes(String(value))) {
          errors.push({
            field: requirement.name,
            message: `Invalid selection. Valid options: ${validValues.join(", ")}`,
            code: "INVALID_OPTION",
          });
        }
      }
      break;

    case "multiselect":
      if (!Array.isArray(value)) {
        errors.push({
          field: requirement.name,
          message: "Expected an array for multiselect",
          code: "INVALID_TYPE",
        });
      }
      break;

    case "string":
    case "secret":
      if (typeof value !== "string" && value !== undefined && value !== null) {
        errors.push({
          field: requirement.name,
          message: `Expected a string, got ${typeof value}`,
          code: "INVALID_TYPE",
        });
      }
      if (typeof value === "string") {
        if (
          requirement.min !== undefined &&
          value.length < requirement.min
        ) {
          errors.push({
            field: requirement.name,
            message: `Value must be at least ${requirement.min} characters`,
            code: "TOO_SHORT",
          });
        }
        if (
          requirement.max !== undefined &&
          value.length > requirement.max
        ) {
          errors.push({
            field: requirement.name,
            message: `Value must be at most ${requirement.max} characters`,
            code: "TOO_LONG",
          });
        }
      }
      break;
  }

  // Required field check (applies to all types)
  if (
    requirement.required &&
    (value === undefined || value === null || value === "")
  ) {
    errors.push({
      field: requirement.name,
      message: `${requirement.label || requirement.name} is required`,
      code: "REQUIRED",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}
