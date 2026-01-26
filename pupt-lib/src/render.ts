import type { PuptElement, PuptNode, RenderResult, RenderOptions, RenderContext, PostExecutionAction, ComponentType } from './types';
import { Fragment } from './jsx-runtime';
import { isComponentClass, Component } from './component';
import { defaultRegistry } from './services/component-registry';
import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from './types/context';

/** Type for function components */
type FunctionComponent<P = Record<string, unknown>> = (props: P & { children?: PuptNode }) => PuptNode;

export function render(
  element: PuptElement,
  options: RenderOptions = {},
): RenderResult {
  const {
    inputs = new Map(),
    registry = defaultRegistry,
    env = DEFAULT_ENVIRONMENT,
    trim = true,
  } = options;

  const postExecution: PostExecutionAction[] = [];

  const context: RenderContext = {
    inputs: inputs instanceof Map ? inputs : new Map(Object.entries(inputs)),
    env: { ...env, runtime: createRuntimeConfig() },
    scope: null, // Set during component rendering
    registry,
    postExecution,
  };

  const text = renderNode(element, context);

  return {
    text: trim ? text.trim() : text,
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
    const instance = new (type as new () => Component)();
    const result = instance.render({ ...props, children }, context);
    return renderNode(result, context);
  }

  // Function component (non-class function)
  if (typeof type === 'function' && !isComponentClass(type)) {
    const fn = type as FunctionComponent;
    const result = fn({ ...props, children });
    return renderNode(result, context);
  }

  // String type - look up in registry
  if (typeof type === 'string') {
    const ComponentClass: ComponentType | undefined = context.registry.get(type);
    if (ComponentClass) {
      if (isComponentClass(ComponentClass)) {
        const instance = new (ComponentClass as new () => Component)();
        const result = instance.render({ ...props, children }, context);
        return renderNode(result, context);
      }
      // Function component from registry
      const fn = ComponentClass as FunctionComponent;
      const result = fn({ ...props, children });
      return renderNode(result, context);
    }
    // Unknown string type - render as-is for now
    console.warn(`Unknown component: ${type}`);
    return children.map(c => renderNode(c, context)).join('');
  }

  return '';
}
