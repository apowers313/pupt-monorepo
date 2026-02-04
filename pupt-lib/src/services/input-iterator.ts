import type { PuptElement, PuptNode, InputRequirement, ValidationResult, RenderContext } from '../types';
import { Fragment } from '../jsx-runtime';
import { isComponentClass, Component } from '../component';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from '../types/context';
import { TYPE, PROPS, CHILDREN } from '../types/symbols';
import { isPuptElement, isDeferredRef } from '../types/element';

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

/**
 * Strategy for handling inputs without defaults in non-interactive mode
 */
export type OnMissingDefaultStrategy = 'error' | 'skip';

export interface InputIteratorOptions {
  validateOnSubmit?: boolean;
  /** Override environment detection. Useful for testing. */
  environment?: RuntimeEnvironment;
  /**
   * Pre-supply input values. Inputs with pre-supplied values will be skipped
   * during iteration (they won't appear as requirements to collect).
   */
  values?: Record<string, unknown>;
  /**
   * Enable non-interactive mode. When true, inputs are automatically filled
   * with their default values. Use with `onMissingDefault` to control behavior
   * when a required input has no default.
   */
  nonInteractive?: boolean;
  /**
   * Strategy for handling inputs without defaults in non-interactive mode.
   * - 'error' (default): Throw an error if a required input has no default
   * - 'skip': Skip inputs without defaults, leaving them undefined
   */
  onMissingDefault?: OnMissingDefaultStrategy;
}

export interface InputIterator {
  /**
   * Start the iterator by collecting input requirements from the element tree.
   * This is async to support components with async render methods.
   */
  start(): Promise<void>;
  current(): InputRequirement | null;
  submit(value: unknown): Promise<ValidationResult>;
  /**
   * Advance to the next unfilled requirement.
   * This is async to support re-collecting requirements from async components.
   */
  advance(): Promise<void>;
  isDone(): boolean;
  getValues(): Map<string, unknown>;
  /**
   * Run through all inputs non-interactively using defaults and pre-supplied values.
   * This is a convenience method that handles the entire iteration loop.
   *
   * @throws Error if a required input has no default and onMissingDefault is 'error'
   * @returns Map of all collected values
   */
  runNonInteractive(): Promise<Map<string, unknown>>;
}

type FunctionComponent<P = Record<string, unknown>> = (props: P & { children?: PuptNode }) => PuptNode | Promise<PuptNode>;

export function createInputIterator(
  element: PuptElement,
  options: InputIteratorOptions = {},
): InputIterator {
  const {
    validateOnSubmit = true,
    environment = detectEnvironment(),
    values: preSuppliedValues = {},
    nonInteractive = false,
    onMissingDefault = 'error',
  } = options;

  let state: IteratorState = 'NOT_STARTED';
  const values = new Map<string, unknown>();
  let requirements: InputRequirement[] = [];
  let currentIndex = 0;

  // Pre-populate values with pre-supplied values
  for (const [key, value] of Object.entries(preSuppliedValues)) {
    values.set(key, value);
  }

  /**
   * Process inputs non-interactively using defaults.
   * Called automatically when nonInteractive option is true.
   */
  async function processNonInteractively(): Promise<void> {
    // Collect all requirements first
    const allReqs = await collectRequirements(element);

    for (const req of allReqs) {
      // Skip if already has a value (pre-supplied)
      if (values.has(req.name)) {
        continue;
      }

      // Determine the value to use
      let valueToUse: unknown;

      if (req.default !== undefined) {
        valueToUse = req.default;
      } else if (req.required) {
        // Required input with no default
        if (onMissingDefault === 'error') {
          throw new Error(
            `Non-interactive mode: Required input "${req.name}" has no default value. ` +
            'Either provide a default in the component, pre-supply a value, or use onMissingDefault: \'skip\'.',
          );
        }
        // onMissingDefault === 'skip' - leave undefined
        continue;
      } else {
        // Optional input with no default - skip
        continue;
      }

      // Validate the default value
      if (validateOnSubmit) {
        const result = await validateInput(req, valueToUse);
        if (!result.valid) {
          const errorMessages = result.errors.map(e => e.message).join('; ');
          throw new Error(
            `Non-interactive mode: Validation failed for "${req.name}": ${errorMessages}`,
          );
        }
      }

      values.set(req.name, valueToUse);
    }
  }

  async function collectRequirements(node: PuptNode): Promise<InputRequirement[]> {
    const collected: InputRequirement[] = [];

    // Create a render context with requirement collection enabled
    const context: RenderContext & { __requirements: InputRequirement[] } = {
      inputs: values,
      env: { ...DEFAULT_ENVIRONMENT, runtime: createRuntimeConfig() },
      postExecution: [],
      errors: [],
      __requirements: collected,
    };

    // Walk the tree and collect requirements
    await walkNode(node, context);

    return collected;
  }

  /**
   * Find the next requirement index that doesn't have a value yet.
   * This handles both pre-supplied values and previously collected values.
   */
  function findNextUnfilledIndex(reqs: InputRequirement[], startIndex: number): number {
    for (let i = startIndex; i < reqs.length; i++) {
      if (!values.has(reqs[i].name)) {
        return i;
      }
    }
    return reqs.length; // All filled
  }

  /**
   * Follow a property path on an object to retrieve a nested value.
   * Used for resolving deferred references like {user.name}.
   *
   * @param obj - The object to traverse
   * @param path - Array of property keys/indices to follow
   * @returns The value at the path, or undefined if not found
   */
  function followPath(obj: unknown, path: (string | number)[]): unknown {
    return path.reduce((current, key) => {
      if (current == null) return undefined;
      return (current as Record<string | number, unknown>)[key];
    }, obj);
  }

  /**
   * Resolve a single prop value by looking up element references in the values map.
   * For the input iterator, we look up collected/default values instead of rendered values.
   *
   * @param value - The prop value to resolve
   * @returns The resolved value
   */
  function resolveIteratorPropValue(value: unknown): unknown {
    if (isPuptElement(value)) {
      // Direct element reference - look up in values map or get default
      const elementProps = value[PROPS] as Record<string, unknown>;
      const elementName = elementProps.name as string | undefined;
      if (elementName && values.has(elementName)) {
        return values.get(elementName);
      }
      // Fall back to default value if available
      if (elementProps.default !== undefined) {
        return elementProps.default;
      }
      // Return undefined if no value and no default
      return undefined;
    }

    if (isDeferredRef(value)) {
      // Deferred reference - get element's value, then follow path
      const elementProps = value.element[PROPS] as Record<string, unknown>;
      const elementName = elementProps.name as string | undefined;
      let elementValue: unknown;
      if (elementName && values.has(elementName)) {
        elementValue = values.get(elementName);
      } else if (elementProps.default !== undefined) {
        elementValue = elementProps.default;
      }
      return followPath(elementValue, value.path);
    }

    if (Array.isArray(value)) {
      // Recursively resolve array elements
      return value.map(item => resolveIteratorPropValue(item));
    }

    if (value !== null && typeof value === 'object' && !isPuptElement(value) && !isDeferredRef(value)) {
      // Recursively resolve object properties
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = resolveIteratorPropValue(val);
      }
      return resolved;
    }

    // Primitive value - return as-is
    return value;
  }

  /**
   * Resolve all props by looking up element references in the values map.
   *
   * @param props - The props object to resolve
   * @returns The props with element references replaced by their values
   */
  function resolveIteratorProps(props: Record<string, unknown>): Record<string, unknown> {
    if (props == null) {
      return {};
    }
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      resolved[key] = resolveIteratorPropValue(value);
    }
    return resolved;
  }

  async function walkNode(
    node: PuptNode,
    context: RenderContext & { __requirements: InputRequirement[] },
  ): Promise<void> {
    if (node === null || node === undefined || node === false) {
      return;
    }

    if (typeof node === 'string' || typeof node === 'number') {
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        await walkNode(child, context);
      }
      return;
    }

    // PuptElement
    const el = node as PuptElement;
    const type = el[TYPE];
    const props = el[PROPS];
    const children = el[CHILDREN];

    // Fragment - just walk children
    if (type === Fragment) {
      for (const child of children) {
        await walkNode(child, context);
      }
      return;
    }

    // Component class - render it to collect requirements
    if (isComponentClass(type)) {
      // Walk children directly to detect Ask components.
      // This handles cases where the component doesn't return its children in render output.
      // (Fix for GitHub issue #14)
      if (children && children.length > 0) {
        for (const child of children) {
          await walkNode(child, context);
        }
      }

      const instance = new (type as new () => Component)();
      // Resolve element props to their values before passing to render()
      // This ensures components receive primitive values instead of PuptElement objects
      const resolvedProps = resolveIteratorProps(props as Record<string, unknown>);
      // Pass undefined as resolvedValue since we're only collecting requirements
      const renderResult = instance.render!({ ...resolvedProps, children }, undefined as never, context);

      // Handle both sync and async render methods
      const result = renderResult instanceof Promise ? await renderResult : renderResult;

      // Still walk the render result for Ask components in the rendered output
      if (result !== null && typeof result === 'object') {
        await walkNode(result, context);
      }
      return;
    }

    // Function component
    if (typeof type === 'function' && !isComponentClass(type)) {
      // Walk children directly to detect Ask components.
      // This handles cases where the component doesn't return its children in render output.
      // (Fix for GitHub issue #14)
      if (children && children.length > 0) {
        for (const child of children) {
          await walkNode(child, context);
        }
      }

      const fn = type as FunctionComponent;
      // Resolve element props to their values before passing to render()
      const resolvedProps = resolveIteratorProps(props as Record<string, unknown>);
      const renderResult = fn({ ...resolvedProps, children });

      // Handle both sync and async function components
      const result = renderResult instanceof Promise ? await renderResult : renderResult;

      // Still walk the render result for Ask components in the rendered output
      if (result !== null && typeof result === 'object') {
        await walkNode(result, context);
      }
      return;
    }

    // String type - should not happen with ES module evaluation
    // Just walk children if encountered
    if (typeof type === 'string') {
      for (const child of children) {
        await walkNode(child, context);
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
    async start() {
      if (state !== 'NOT_STARTED') {
        throw new Error('Iterator already started.');
      }

      // In non-interactive mode, we process everything upfront
      // Use runNonInteractive() instead for convenience.
      if (nonInteractive) {
        // Mark as started but immediately done - user should use runNonInteractive()
        // or getValues() after awaiting the processing
        state = 'DONE';
        return;
      }

      requirements = await collectRequirements(element);

      // Find the first requirement that doesn't have a pre-supplied value
      currentIndex = findNextUnfilledIndex(requirements, 0);
      state = currentIndex < requirements.length ? 'ITERATING' : 'DONE';
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

    async advance() {
      if (state === 'NOT_STARTED') {
        throw new Error('Iterator not started. Call start() first.');
      }
      if (state === 'ITERATING') {
        throw new Error('Current requirement not submitted. Call submit() first.');
      }
      if (state === 'DONE') {
        throw new Error('Iterator is done. Nothing to advance.');
      }

      // Re-collect requirements with new values (for conditionals)
      requirements = await collectRequirements(element);

      // Find the next requirement that doesn't have a value yet
      currentIndex = findNextUnfilledIndex(requirements, currentIndex + 1);
      state = currentIndex < requirements.length ? 'ITERATING' : 'DONE';
    },

    isDone() {
      return state === 'DONE';
    },

    getValues() {
      return new Map(values);
    },

    async runNonInteractive(): Promise<Map<string, unknown>> {
      // Process all inputs using defaults and pre-supplied values
      await processNonInteractively();

      // Mark as done since all inputs are processed
      state = 'DONE';

      return this.getValues();
    },
  };
}
