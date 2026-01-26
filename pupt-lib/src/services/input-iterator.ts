import type { PuptElement, PuptNode, InputRequirement, ValidationResult, RenderContext } from '../types';
import { Fragment } from '../jsx-runtime';
import { isComponentClass, Component } from '../component';
import { defaultRegistry } from './component-registry';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from '../types/context';

type IteratorState = 'NOT_STARTED' | 'ITERATING' | 'SUBMITTED' | 'DONE';

export type RuntimeEnvironment = 'node' | 'browser';

/**
 * Detect if we're running in Node.js or browser environment
 */
function detectEnvironment(): RuntimeEnvironment {
  // Check for Node.js
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }
  return 'browser';
}

/**
 * Filesystem validation helpers - only available in Node.js
 */
interface FilesystemHelpers {
  existsSync: (path: string) => boolean;
  statSync: (path: string) => { isDirectory: () => boolean };
}

let fsHelpers: FilesystemHelpers | null = null;

async function getFilesystemHelpers(): Promise<FilesystemHelpers | null> {
  if (detectEnvironment() !== 'node') {
    return null;
  }

  if (fsHelpers) {
    return fsHelpers;
  }

  try {
    // Dynamic import for Node.js fs module
    const fs = await import('fs');
    fsHelpers = {
      existsSync: fs.existsSync,
      statSync: fs.statSync,
    };
    return fsHelpers;
  } catch {
    return null;
  }
}

export interface InputIteratorOptions {
  validateOnSubmit?: boolean;
  /** Override environment detection. Useful for testing. */
  environment?: RuntimeEnvironment;
}

export interface InputIterator {
  start(): void;
  current(): InputRequirement | null;
  submit(value: unknown): Promise<ValidationResult>;
  advance(): void;
  isDone(): boolean;
  getValues(): Map<string, unknown>;
}

type FunctionComponent<P = Record<string, unknown>> = (props: P & { children?: PuptNode }) => PuptNode;

export function createInputIterator(
  element: PuptElement,
  options: InputIteratorOptions = {},
): InputIterator {
  const { validateOnSubmit = true, environment = detectEnvironment() } = options;

  let state: IteratorState = 'NOT_STARTED';
  const values = new Map<string, unknown>();
  let requirements: InputRequirement[] = [];
  let currentIndex = 0;

  function collectRequirements(node: PuptNode): InputRequirement[] {
    const collected: InputRequirement[] = [];

    // Create a render context with requirement collection enabled
    const context: RenderContext & { __requirements: InputRequirement[] } = {
      inputs: values,
      env: { ...DEFAULT_ENVIRONMENT, runtime: createRuntimeConfig() },
      scope: null,
      registry: defaultRegistry,
      postExecution: [],
      __requirements: collected,
    };

    // Walk the tree and collect requirements
    walkNode(node, context);

    return collected;
  }

  function walkNode(
    node: PuptNode,
    context: RenderContext & { __requirements: InputRequirement[] },
  ): void {
    if (node === null || node === undefined || node === false) {
      return;
    }

    if (typeof node === 'string' || typeof node === 'number') {
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        walkNode(child, context);
      }
      return;
    }

    // PuptElement
    const element = node as PuptElement;
    const { type, props, children } = element;

    // Fragment - just walk children
    if (type === Fragment) {
      for (const child of children) {
        walkNode(child, context);
      }
      return;
    }

    // Component class - render it to collect requirements
    if (isComponentClass(type)) {
      const instance = new (type as new () => Component)();
      const result = instance.render({ ...props, children }, context);

      // If the result is not primitive, walk it for more Ask components
      if (result !== null && typeof result === 'object') {
        walkNode(result, context);
      }
      return;
    }

    // Function component
    if (typeof type === 'function' && !isComponentClass(type)) {
      const fn = type as FunctionComponent;
      const result = fn({ ...props, children });

      if (result !== null && typeof result === 'object') {
        walkNode(result, context);
      }
      return;
    }

    // String type - look up in registry
    if (typeof type === 'string') {
      const ComponentClass = context.registry.get(type);
      if (ComponentClass) {
        if (isComponentClass(ComponentClass)) {
          const instance = new (ComponentClass as new () => Component)();
          const result = instance.render({ ...props, children }, context);

          if (result !== null && typeof result === 'object') {
            walkNode(result, context);
          }
          return;
        }

        // Function component from registry
        const fn = ComponentClass as FunctionComponent;
        const result = fn({ ...props, children });

        if (result !== null && typeof result === 'object') {
          walkNode(result, context);
        }
        return;
      }

      // Unknown component - walk children
      for (const child of children) {
        walkNode(child, context);
      }
    }
  }

  async function validateInput(req: InputRequirement, value: unknown): Promise<ValidationResult> {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Get filesystem helpers if in Node.js environment
    const fs = environment === 'node' ? await getFilesystemHelpers() : null;

    // Type validation
    if (req.type === 'number') {
      if (typeof value !== 'number') {
        errors.push({
          field: req.name,
          message: `Expected a number, got ${typeof value}`,
          code: 'INVALID_TYPE',
        });
      } else {
        // Range validation
        if (req.min !== undefined && value < req.min) {
          errors.push({
            field: req.name,
            message: `Value ${value} is below minimum ${req.min}`,
            code: 'BELOW_MIN',
          });
        }
        if (req.max !== undefined && value > req.max) {
          errors.push({
            field: req.name,
            message: `Value ${value} exceeds max ${req.max}`,
            code: 'EXCEEDS_MAX',
          });
        }
      }
    }

    if (req.type === 'string' && typeof value !== 'string') {
      errors.push({
        field: req.name,
        message: `Expected a string, got ${typeof value}`,
        code: 'INVALID_TYPE',
      });
    }

    if (req.type === 'boolean' && typeof value !== 'boolean') {
      errors.push({
        field: req.name,
        message: `Expected a boolean, got ${typeof value}`,
        code: 'INVALID_TYPE',
      });
    }

    // Select validation - check value is one of the options
    if (req.type === 'select' && req.options && req.options.length > 0) {
      const validValues = req.options.map((opt) => opt.value);
      if (!validValues.includes(value as string)) {
        errors.push({
          field: req.name,
          message: `Invalid option "${value}". Valid options: ${validValues.join(', ')}`,
          code: 'INVALID_OPTION',
        });
      }
    }

    // MultiSelect validation - check all values are valid options
    if (req.type === 'multiselect' && req.options && req.options.length > 0) {
      const validValues = req.options.map((opt) => opt.value);
      if (Array.isArray(value)) {
        for (const v of value) {
          if (!validValues.includes(v as string)) {
            errors.push({
              field: req.name,
              message: `Invalid option "${v}". Valid options: ${validValues.join(', ')}`,
              code: 'INVALID_OPTION',
            });
          }
        }
      } else {
        errors.push({
          field: req.name,
          message: `Expected an array for multiselect, got ${typeof value}`,
          code: 'INVALID_TYPE',
        });
      }
    }

    // Rating validation - number within min/max and must be integer
    if (req.type === 'rating') {
      if (typeof value !== 'number') {
        errors.push({
          field: req.name,
          message: `Expected a number, got ${typeof value}`,
          code: 'INVALID_TYPE',
        });
      } else {
        if (!Number.isInteger(value)) {
          errors.push({
            field: req.name,
            message: `Rating must be a whole number, got ${value}`,
            code: 'NOT_INTEGER',
          });
        }
        if (req.min !== undefined && value < req.min) {
          errors.push({
            field: req.name,
            message: `Rating ${value} is below minimum ${req.min}`,
            code: 'BELOW_MIN',
          });
        }
        if (req.max !== undefined && value > req.max) {
          errors.push({
            field: req.name,
            message: `Rating ${value} exceeds maximum ${req.max}`,
            code: 'EXCEEDS_MAX',
          });
        }
      }
    }

    // Date validation
    if (req.type === 'date') {
      if (typeof value !== 'string') {
        errors.push({
          field: req.name,
          message: `Expected a date string, got ${typeof value}`,
          code: 'INVALID_TYPE',
        });
      } else {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          errors.push({
            field: req.name,
            message: `Invalid date format: "${value}"`,
            code: 'INVALID_DATE',
          });
        } else {
          // Min/max date validation
          if (req.minDate) {
            const minDate = req.minDate === 'today' ? new Date() : new Date(req.minDate);
            minDate.setHours(0, 0, 0, 0);
            if (dateValue < minDate) {
              errors.push({
                field: req.name,
                message: `Date must be on or after ${req.minDate}`,
                code: 'DATE_TOO_EARLY',
              });
            }
          }
          if (req.maxDate) {
            const maxDate = req.maxDate === 'today' ? new Date() : new Date(req.maxDate);
            maxDate.setHours(23, 59, 59, 999);
            if (dateValue > maxDate) {
              errors.push({
                field: req.name,
                message: `Date must be on or before ${req.maxDate}`,
                code: 'DATE_TOO_LATE',
              });
            }
          }
        }
      }
    }

    // Secret validation - same as string
    if (req.type === 'secret' && typeof value !== 'string') {
      errors.push({
        field: req.name,
        message: `Expected a string, got ${typeof value}`,
        code: 'INVALID_TYPE',
      });
    }

    // File validation
    if (req.type === 'file') {
      const filePaths: string[] = [];

      if (req.multiple) {
        if (!Array.isArray(value)) {
          errors.push({
            field: req.name,
            message: `Expected an array of file paths, got ${typeof value}`,
            code: 'INVALID_TYPE',
          });
        } else {
          // Validate extensions for each file
          for (const filePath of value) {
            if (typeof filePath === 'string') {
              filePaths.push(filePath);
              if (req.extensions && req.extensions.length > 0) {
                const ext = filePath.substring(filePath.lastIndexOf('.'));
                if (!req.extensions.includes(ext)) {
                  errors.push({
                    field: req.name,
                    message: `File "${filePath}" has invalid extension. Allowed: ${req.extensions.join(', ')}`,
                    code: 'INVALID_EXTENSION',
                  });
                }
              }
            }
          }
        }
      } else {
        if (typeof value !== 'string') {
          errors.push({
            field: req.name,
            message: `Expected a file path string, got ${typeof value}`,
            code: 'INVALID_TYPE',
          });
        } else {
          filePaths.push(value);
          if (req.extensions && req.extensions.length > 0) {
            const ext = value.substring(value.lastIndexOf('.'));
            if (!req.extensions.includes(ext)) {
              errors.push({
                field: req.name,
                message: `File has invalid extension "${ext}". Allowed: ${req.extensions.join(', ')}`,
                code: 'INVALID_EXTENSION',
              });
            }
          }
        }
      }

      // mustExist validation - requires filesystem access
      if (req.mustExist && filePaths.length > 0) {
        if (fs) {
          // Node.js - check filesystem
          for (const filePath of filePaths) {
            if (!fs.existsSync(filePath)) {
              errors.push({
                field: req.name,
                message: `File does not exist: "${filePath}"`,
                code: 'FILE_NOT_FOUND',
              });
            }
          }
        } else {
          // Browser - add warning that validation is skipped
          warnings.push({
            field: req.name,
            message: `Cannot validate mustExist in browser environment. File existence will not be checked for: ${filePaths.join(', ')}`,
          });
        }
      }
    }

    // Path validation
    if (req.type === 'path') {
      if (typeof value !== 'string') {
        errors.push({
          field: req.name,
          message: `Expected a path string, got ${typeof value}`,
          code: 'INVALID_TYPE',
        });
      } else {
        // mustExist validation - requires filesystem access
        if (req.mustExist) {
          if (fs) {
            // Node.js - check filesystem
            if (!fs.existsSync(value)) {
              errors.push({
                field: req.name,
                message: `Path does not exist: "${value}"`,
                code: 'PATH_NOT_FOUND',
              });
            } else if (req.mustBeDirectory) {
              // Check if it's a directory
              try {
                const stat = fs.statSync(value);
                if (!stat.isDirectory()) {
                  errors.push({
                    field: req.name,
                    message: `Path is not a directory: "${value}"`,
                    code: 'NOT_A_DIRECTORY',
                  });
                }
              } catch {
                errors.push({
                  field: req.name,
                  message: `Cannot access path: "${value}"`,
                  code: 'PATH_ACCESS_ERROR',
                });
              }
            }
          } else {
            // Browser - add warning that validation is skipped
            warnings.push({
              field: req.name,
              message: `Cannot validate mustExist/mustBeDirectory in browser environment. Path validation skipped for: ${value}`,
            });
          }
        } else if (req.mustBeDirectory) {
          // mustBeDirectory without mustExist
          if (fs) {
            try {
              if (fs.existsSync(value)) {
                const stat = fs.statSync(value);
                if (!stat.isDirectory()) {
                  errors.push({
                    field: req.name,
                    message: `Path is not a directory: "${value}"`,
                    code: 'NOT_A_DIRECTORY',
                  });
                }
              }
              // If path doesn't exist and mustExist is false, we don't error
            } catch {
              // Ignore access errors when mustExist is false
            }
          } else {
            // Browser - add warning
            warnings.push({
              field: req.name,
              message: `Cannot validate mustBeDirectory in browser environment. Directory validation skipped for: ${value}`,
            });
          }
        }
      }
    }

    // Required validation
    if (req.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: req.name,
        message: `${req.name} is required`,
        code: 'REQUIRED',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  return {
    start() {
      if (state !== 'NOT_STARTED') {
        throw new Error('Iterator already started.');
      }
      requirements = collectRequirements(element);
      state = requirements.length > 0 ? 'ITERATING' : 'DONE';
    },

    current() {
      if (state === 'NOT_STARTED') {
        throw new Error('Iterator not started. Call start() first.');
      }
      if (state === 'DONE') return null;
      return requirements[currentIndex];
    },

    async submit(value: unknown): Promise<ValidationResult> {
      if (state === 'NOT_STARTED') {
        throw new Error('Iterator not started. Call start() first.');
      }
      if (state === 'DONE') {
        throw new Error('Iterator is done. No current requirement.');
      }

      const req = requirements[currentIndex];

      // Validate if enabled
      if (validateOnSubmit) {
        const result = await validateInput(req, value);

        if (result.valid) {
          values.set(req.name, value);
          state = 'SUBMITTED';
        }

        return result;
      }

      // No validation - just accept
      values.set(req.name, value);
      state = 'SUBMITTED';

      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    },

    advance() {
      if (state === 'NOT_STARTED') {
        throw new Error('Iterator not started. Call start() first.');
      }
      if (state === 'ITERATING') {
        throw new Error('Current requirement not submitted. Call submit() first.');
      }
      if (state === 'DONE') {
        throw new Error('Iterator is done. Nothing to advance.');
      }

      currentIndex++;

      // Re-collect requirements with new values (for conditionals)
      requirements = collectRequirements(element);

      state = currentIndex < requirements.length ? 'ITERATING' : 'DONE';
    },

    isDone() {
      return state === 'DONE';
    },

    getValues() {
      return new Map(values);
    },
  };
}
