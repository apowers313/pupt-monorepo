// Input-related types for pupt-lib

import type { ZodType } from 'zod';

/**
 * Describes a required input for a prompt
 */
export interface InputRequirement {
  name: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'select' | 'multiselect' | 'date' | 'secret' | 'file' | 'path' | 'rating';
  required: boolean;
  default?: unknown;
  schema?: ZodType;
  min?: number;
  max?: number;
  options?: Array<{
    value: string;
    label: string;
    text?: string;  // Text to render in prompt (defaults to label)
  }>;

  // Editor-specific
  language?: string;

  // File/Path-specific
  extensions?: string[];
  multiple?: boolean;
  mustExist?: boolean;
  mustBeDirectory?: boolean;
  includeContents?: boolean;

  // Date-specific
  includeTime?: boolean;
  minDate?: string;
  maxDate?: string;

  // Secret-specific
  masked?: boolean;

  // Rating-specific
  labels?: Record<number, string>;
}

/**
 * Result of validating inputs against requirements
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: Array<{ field: string; message: string }>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

