import type { PuptElement, PuptNode, RenderResult, RenderOptions, RenderContext, PostExecutionAction, RenderError } from './types';
import { Fragment } from './jsx-runtime';
import { isComponentClass, Component } from './component';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from './types/context';
import { validateProps, getSchema, getComponentName } from './services/prop-validator';

/** Type for function components */
type FunctionComponent<P = Record<string, unknown>> = (props: P & { children?: PuptNode }) => PuptNode;

export function render(
  element: PuptElement,
  options: RenderOptions = {},
): RenderResult {
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

  const text = renderNode(element, context);
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

function renderNode(
  node: PuptNode,
  context: RenderContext,
): string {
  if (node === null || node === undefined || node === false) {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(n => renderNode(n, context)).join('');
  }

  // PuptElement
  return renderElement(node as PuptElement, context);
}

function renderChildrenFallback(children: PuptNode[], context: RenderContext): string {
  return children.map(c => renderNode(c, context)).join('');
}

function renderComponentWithValidation(
  type: unknown,
  componentName: string,
  props: Record<string, unknown>,
  children: PuptNode[],
  context: RenderContext,
  renderFn: () => PuptNode,
): string {
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
    return renderNode(result, context);
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

function renderElement(
  element: PuptElement,
  context: RenderContext,
): string {
  const { type, props, children } = element;

  // Fragment - just render children
  if (type === Fragment) {
    return children.map(c => renderNode(c, context)).join('');
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
    return children.map(c => renderNode(c, context)).join('');
  }

  return '';
}
