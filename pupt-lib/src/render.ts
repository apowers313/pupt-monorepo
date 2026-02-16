import type { PuptElement, PuptNode, RenderResult, RenderOptions, RenderContext, PostExecutionAction, RenderError } from './types';
import { isWarningCode } from './types/render';
import { Fragment } from './jsx-runtime';
import { isComponentClass, Component } from './component';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from './types/context';
import { validateProps, getSchema, getComponentName } from './services/prop-validator';
import { TYPE, PROPS, CHILDREN } from './types/symbols';
import { isPuptElement, isDeferredRef } from './types/element';

/** Type for function components - context is passed as optional second argument */
type FunctionComponent<P = Record<string, unknown>> = (props: P & { children?: PuptNode }, context?: RenderContext) => PuptNode | Promise<PuptNode>;

/**
 * Internal state for rendering, passed through the render tree.
 * Contains the resolved values map for component value resolution.
 */
interface RenderState {
  context: RenderContext;
  resolvedValues: Map<PuptElement, unknown>;
  /** Track pending resolutions to avoid duplicate concurrent resolution of the same element */
  pendingResolutions: Map<PuptElement, Promise<string>>;
}

/**
 * Follow a property path on an object to retrieve a nested value.
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
 * Ensure an element is resolved, handling concurrent resolution requests.
 * Uses pendingResolutions to avoid resolving the same element multiple times.
 *
 * @param element - The element to ensure is resolved
 * @param state - The current render state
 */
async function ensureElementResolved(element: PuptElement, state: RenderState): Promise<void> {
  // Already resolved - nothing to do
  if (state.resolvedValues.has(element)) {
    return;
  }

  // Check if resolution is already in progress
  const pending = state.pendingResolutions.get(element);
  if (pending) {
    // Wait for the existing resolution to complete
    await pending;
    return;
  }

  // Start new resolution and track it
  const resolutionPromise = renderElement(element, state);
  state.pendingResolutions.set(element, resolutionPromise);

  try {
    await resolutionPromise;
  } finally {
    // Clean up pending state after completion
    state.pendingResolutions.delete(element);
  }
}

/**
 * Resolve a single prop value by rendering element references.
 * This ensures that element dependencies are resolved before their values are used.
 *
 * @param value - The prop value to resolve
 * @param state - The current render state with resolved values
 * @returns The resolved value
 */
async function resolvePropValue(value: unknown, state: RenderState): Promise<unknown> {
  if (isPuptElement(value)) {
    // Direct element reference - resolve it first if not already resolved
    await ensureElementResolved(value, state);
    return state.resolvedValues.get(value);
  }

  if (isDeferredRef(value)) {
    // Deferred reference - ensure element is resolved, then follow path
    await ensureElementResolved(value.element, state);
    const elementValue = state.resolvedValues.get(value.element);
    return followPath(elementValue, value.path);
  }

  if (Array.isArray(value)) {
    // Recursively resolve array elements
    const resolved = await Promise.all(value.map(item => resolvePropValue(item, state)));
    return resolved;
  }

  if (value !== null && typeof value === 'object' && !isPuptElement(value) && !isDeferredRef(value)) {
    // Recursively resolve object properties
    const resolved: Record<string, unknown> = {};
    const entries = Object.entries(value);
    const resolvedValues = await Promise.all(entries.map(([_, val]) => resolvePropValue(val, state)));
    entries.forEach(([key], index) => {
      resolved[key] = resolvedValues[index];
    });
    return resolved;
  }

  // Primitive value - return as-is
  return value;
}

/**
 * Resolve props by rendering element dependencies and replacing references with their values.
 *
 * @param props - The props object to resolve
 * @param state - The current render state with resolved values
 * @returns The props with element references replaced by their resolved values
 */
async function resolveProps(
  props: Record<string, unknown>,
  state: RenderState,
): Promise<Record<string, unknown>> {
  if (props == null) {
    return {};
  }
  const resolved: Record<string, unknown> = {};
  const entries = Object.entries(props);
  const resolvedValues = await Promise.all(entries.map(([_, value]) => resolvePropValue(value, state)));
  entries.forEach(([key], index) => {
    resolved[key] = resolvedValues[index];
  });
  return resolved;
}

/**
 * Render a PuptElement tree to a string.
 *
 * This function is async to support components with async render methods.
 * Components can perform async operations like API calls in their render methods.
 *
 * @param element - The root PuptElement to render
 * @param options - Render options including inputs and environment
 * @returns A Promise resolving to the RenderResult
 *
 * @example
 * ```typescript
 * const result = await render(<MyPrompt />);
 * console.log(result.text);
 * ```
 */
export async function render(
  element: PuptElement,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const {
    inputs = new Map(),
    env = DEFAULT_ENVIRONMENT,
    trim = true,
    throwOnWarnings = false,
    ignoreWarnings = [],
  } = options;

  const postExecution: PostExecutionAction[] = [];
  const errors: RenderError[] = [];

  const context: RenderContext = {
    inputs: inputs instanceof Map ? inputs : new Map(Object.entries(inputs)),
    env: { ...env, runtime: createRuntimeConfig() },
    postExecution,
    errors,
    metadata: new Map(),
  };

  const state: RenderState = {
    context,
    resolvedValues: new Map(),
    pendingResolutions: new Map(),
  };

  // Pre-seed Ask component defaults into context.inputs before rendering.
  // This ensures defaults are available when If components evaluate formulas,
  // even with parallel rendering of sibling elements.
  seedAskDefaults(element, context);

  const text = await renderNode(element, state);
  const trimmedText = trim ? text.trim() : text;

  // Separate non-fatal warnings from hard errors, applying ignore/promote options
  const ignoreSet = new Set(ignoreWarnings);
  const warnings: RenderError[] = [];
  const hardErrors: RenderError[] = [];

  for (const err of errors) {
    if (isWarningCode(err.code)) {
      if (ignoreSet.has(err.code)) continue;
      if (throwOnWarnings) {
        hardErrors.push(err);
      } else {
        warnings.push(err);
      }
    } else {
      hardErrors.push(err);
    }
  }

  if (hardErrors.length > 0) {
    return {
      ok: false,
      text: trimmedText,
      errors: [...hardErrors, ...warnings],
      postExecution,
    };
  }

  if (warnings.length > 0) {
    return {
      ok: true,
      text: trimmedText,
      errors: warnings,
      postExecution,
    };
  }

  return {
    ok: true,
    text: trimmedText,
    postExecution,
  };
}

async function renderNode(
  node: PuptNode,
  state: RenderState,
): Promise<string> {
  if (node === null || node === undefined || node === false) {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    // Render children in parallel for better performance
    const results = await Promise.all(node.map(n => renderNode(n, state)));
    return results.join('');
  }

  // Handle DeferredRef (property access like {user.displayName})
  if (isDeferredRef(node)) {
    await ensureElementResolved(node.element, state);
    const elementValue = state.resolvedValues.get(node.element);
    const value = followPath(elementValue, node.path);
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  // PuptElement
  const element = node as PuptElement;
  if (isPuptElement(element)) {
    // Check if this element was already resolved (variable reference like {firstName})
    // If so, return the string representation of the resolved value
    if (state.resolvedValues.has(element)) {
      const resolved = state.resolvedValues.get(element);
      if (resolved === null || resolved === undefined) {
        return '';
      }
      return String(resolved);
    }

    // Check if resolution is already in progress (parallel rendering)
    const pending = state.pendingResolutions.get(element);
    if (pending) {
      // Wait for resolution, then return the resolved value
      await pending;
      if (state.resolvedValues.has(element)) {
        const resolved = state.resolvedValues.get(element);
        if (resolved === null || resolved === undefined) {
          return '';
        }
        return String(resolved);
      }
    }

    // Start new resolution and track it to handle parallel rendering
    const resolutionPromise = renderElement(element, state);
    state.pendingResolutions.set(element, resolutionPromise);
    try {
      return await resolutionPromise;
    } finally {
      state.pendingResolutions.delete(element);
    }
  }

  // Render non-PuptElement (shouldn't happen in normal flow)
  return renderElement(node as PuptElement, state);
}

async function renderChildrenFallback(children: PuptNode[], state: RenderState): Promise<string> {
  const results = await Promise.all(children.map(c => renderNode(c, state)));
  return results.join('');
}

async function renderComponentWithValidation(
  type: unknown,
  componentName: string,
  props: Record<string, unknown>,
  children: PuptNode[],
  state: RenderState,
  renderFn: (resolvedValue: unknown) => PuptNode | Promise<PuptNode>,
  resolveFn?: () => unknown | Promise<unknown>,
): Promise<string> {
  // Schema is optional - validate props only if schema is provided
  const schema = getSchema(type);
  if (schema) {
    const validationErrors = validateProps(componentName, { ...props, children }, schema);
    if (validationErrors.length > 0) {
      state.context.errors.push(...validationErrors);
      return renderChildrenFallback(children, state);
    }
  }

  try {
    // Phase 1: Resolve value if component has resolve()
    let resolvedValue: unknown;
    if (resolveFn) {
      const resolveResult = resolveFn();
      resolvedValue = resolveResult instanceof Promise ? await resolveResult : resolveResult;
    }

    // Phase 2: Render if component has render()
    const result = renderFn(resolvedValue);
    // Handle both sync and async render methods
    const resolvedResult = result instanceof Promise ? await result : result;
    return renderNode(resolvedResult, state);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    state.context.errors.push({
      component: componentName,
      prop: null,
      message: `Runtime error in ${componentName}: ${message}`,
      code: 'runtime_error',
      path: [],
    });
    return renderChildrenFallback(children, state);
  }
}

async function renderElement(
  element: PuptElement,
  state: RenderState,
): Promise<string> {
  const type = element[TYPE];
  const props = element[PROPS];
  const children = element[CHILDREN];

  // Fragment - just render children in parallel
  if (type === Fragment) {
    const results = await Promise.all(children.map(c => renderNode(c, state)));
    return results.join('');
  }

  // Resolve props by rendering element dependencies and looking up their values
  const resolvedProps = await resolveProps(props as Record<string, unknown>, state);

  // Component class
  if (isComponentClass(type)) {
    const instance = new (type as new () => Component)();

    // Check if component has resolve() method
    const hasResolve = typeof instance.resolve === 'function';
    const hasRender = typeof instance.render === 'function';

    // Create resolve function if component has resolve()
    const resolveFn = hasResolve
      ? () => instance.resolve!({ ...resolvedProps, children }, state.context)
      : undefined;

    // Create render function
    const renderFn = (resolvedValue: unknown) => {
      if (hasRender) {
        // Pass resolved value as second argument to render()
        return instance.render!({ ...resolvedProps, children }, resolvedValue as never, state.context);
      }
      // No render method - return resolved value to be stringified
      if (resolvedValue === null || resolvedValue === undefined) {
        return '';
      }
      return String(resolvedValue);
    };

    return renderComponentWithValidation(
      type,
      getComponentName(type),
      resolvedProps,
      children,
      state,
      (resolvedValue: unknown) => {
        // Store resolved value for other components to reference
        if (hasResolve) {
          state.resolvedValues.set(element, resolvedValue);
        }
        return renderFn(resolvedValue);
      },
      resolveFn,
    );
  }

  // Function component (non-class function)
  if (typeof type === 'function' && !isComponentClass(type)) {
    return renderComponentWithValidation(
      type,
      getComponentName(type),
      resolvedProps,
      children,
      state,
      () => {
        const fn = type as FunctionComponent;
        return fn({ ...resolvedProps, children }, state.context);
      },
    );
  }

  // String type - this indicates a bug: either the preprocessor failed to inject
  // imports, or an element was manually constructed with a string type.
  if (typeof type === 'string') {
    state.context.errors.push({
      component: type,
      prop: null,
      message: `Unknown component type "${type}". Components should be imported, not referenced by string.`,
      code: 'unknown_component',
      path: [],
    });
    return renderChildrenFallback(children, state);
  }

  return '';
}

/**
 * Walk the element tree and pre-seed default values from Ask components
 * into context.inputs. This ensures that formula-based conditions in If
 * components can reference Ask defaults during parallel rendering.
 *
 * Ask components are identified by having both `name` and `label` string props
 * (the askBaseSchema pattern). Handles both explicit `default` props and
 * static `implicitDefault` values (e.g., AskConfirm defaults to `false`).
 */
function seedAskDefaults(node: PuptNode, context: RenderContext): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const child of node) {
      seedAskDefaults(child, context);
    }
    return;
  }

  if (!isPuptElement(node)) return;

  const element = node as PuptElement;
  const type = element[TYPE];
  const props = element[PROPS] as Record<string, unknown>;
  const children = element[CHILDREN];

  // Seed defaults from Ask components (identified by name + label props)
  if (typeof props.name === 'string' && typeof props.label === 'string'
    && !context.inputs.has(props.name)) {
    if (props.default !== undefined) {
      context.inputs.set(props.name, props.default);
    } else if (isComponentClass(type)
      && 'implicitDefault' in (type as unknown as Record<string, unknown>)) {
      context.inputs.set(props.name,
        (type as unknown as Record<string, unknown>).implicitDefault);
    }
  }

  // Recurse into children
  for (const child of children) {
    seedAskDefaults(child, context);
  }
}
