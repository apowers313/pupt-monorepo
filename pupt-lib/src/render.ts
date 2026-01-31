import type { PuptElement, PuptNode, RenderResult, RenderOptions, RenderContext, PostExecutionAction, RenderError } from './types';
import { Fragment } from './jsx-runtime';
import { isComponentClass, Component } from './component';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from './types/context';
import { validateProps, getSchema, getComponentName } from './services/prop-validator';

/** Type for function components */
type FunctionComponent<P = Record<string, unknown>> = (props: P & { children?: PuptNode }) => PuptNode | Promise<PuptNode>;

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
  } = options;

  const postExecution: PostExecutionAction[] = [];
  const errors: RenderError[] = [];

  const context: RenderContext = {
    inputs: inputs instanceof Map ? inputs : new Map(Object.entries(inputs)),
    env: { ...env, runtime: createRuntimeConfig() },
    postExecution,
    errors,
  };

  const text = await renderNode(element, context);
  const trimmedText = trim ? text.trim() : text;

  if (errors.length > 0) {
    return {
      ok: false,
      text: trimmedText,
      errors,
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
  context: RenderContext,
): Promise<string> {
  if (node === null || node === undefined || node === false) {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    // Render children in parallel for better performance
    const results = await Promise.all(node.map(n => renderNode(n, context)));
    return results.join('');
  }

  // PuptElement
  return renderElement(node as PuptElement, context);
}

async function renderChildrenFallback(children: PuptNode[], context: RenderContext): Promise<string> {
  const results = await Promise.all(children.map(c => renderNode(c, context)));
  return results.join('');
}

async function renderComponentWithValidation(
  type: unknown,
  componentName: string,
  props: Record<string, unknown>,
  children: PuptNode[],
  context: RenderContext,
  renderFn: () => PuptNode | Promise<PuptNode>,
): Promise<string> {
  const schema = getSchema(type);
  if (!schema) {
    context.errors.push({
      component: componentName,
      prop: null,
      message: `Component "${componentName}" does not have a schema defined. All components must declare a static schema.`,
      code: 'missing_schema',
      path: [],
    });
    return renderChildrenFallback(children, context);
  }

  const validationErrors = validateProps(componentName, { ...props, children }, schema);
  if (validationErrors.length > 0) {
    context.errors.push(...validationErrors);
    return renderChildrenFallback(children, context);
  }

  try {
    const result = renderFn();
    // Handle both sync and async render methods
    const resolvedResult = result instanceof Promise ? await result : result;
    return renderNode(resolvedResult, context);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    context.errors.push({
      component: componentName,
      prop: null,
      message: `Runtime error in ${componentName}: ${message}`,
      code: 'runtime_error',
      path: [],
    });
    return renderChildrenFallback(children, context);
  }
}

async function renderElement(
  element: PuptElement,
  context: RenderContext,
): Promise<string> {
  const { type, props, children } = element;

  // Fragment - just render children in parallel
  if (type === Fragment) {
    const results = await Promise.all(children.map(c => renderNode(c, context)));
    return results.join('');
  }

  // Component class
  if (isComponentClass(type)) {
    return renderComponentWithValidation(
      type,
      getComponentName(type),
      props as Record<string, unknown>,
      children,
      context,
      () => {
        const instance = new (type as new () => Component)();
        return instance.render({ ...props, children }, context);
      },
    );
  }

  // Function component (non-class function)
  if (typeof type === 'function' && !isComponentClass(type)) {
    return renderComponentWithValidation(
      type,
      getComponentName(type),
      props as Record<string, unknown>,
      children,
      context,
      () => {
        const fn = type as FunctionComponent;
        return fn({ ...props, children });
      },
    );
  }

  // String type - should not happen with ES module evaluation
  // This would only occur if JSX was created with a string type directly
  if (typeof type === 'string') {
    console.warn(`Unknown component type "${type}". Components should be imported, not referenced by string.`);
    const results = await Promise.all(children.map(c => renderNode(c, context)));
    return results.join('');
  }

  return '';
}
