// JSX Runtime for pupt-lib

import type { PuptElement, PuptNode, ComponentType } from '../types';

/**
 * Fragment symbol for grouping elements without a wrapper
 */
export const Fragment = Symbol.for('pupt.Fragment');

/**
 * Normalize children into a flat array, filtering out null/undefined/false
 * but keeping 0 and other falsy values that should render.
 */
function normalizeChildren(children: PuptNode | undefined): PuptNode[] {
  if (children === null || children === undefined) {
    return [];
  }

  if (Array.isArray(children)) {
    const result: PuptNode[] = [];
    flattenChildren(children, result);
    return result;
  }

  return [children];
}

/**
 * Recursively flatten nested arrays and filter out null/undefined/false
 */
function flattenChildren(children: PuptNode[], result: PuptNode[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    if (Array.isArray(child)) {
      flattenChildren(child, result);
    } else {
      result.push(child);
    }
  }
}

/**
 * Validate and pass through the element type.
 * - Strings pass through as-is (e.g., "div", "span")
 * - Symbols pass through as-is (e.g., Fragment)
 * - Functions/classes pass through as-is (component references)
 */
function validateType<P extends Record<string, unknown>>(
  type: string | symbol | ComponentType<P>,
): string | symbol | ComponentType<P> {
  if (type === undefined || type === null) {
    throw new Error(
      'JSX element type is undefined. This usually means you\'re using a component that doesn\'t exist ' +
      '(e.g., Ask.MultiSelect when only Ask.Select is available). Check your component name spelling.',
    );
  }
  return type;
}

/**
 * Create a JSX element with a single child.
 * Called by the JSX transform for elements with one child.
 *
 * @param type - Element type (string tag, symbol like Fragment, or component)
 * @param props - Properties including children
 * @returns A PuptElement
 */
export function jsx<P extends Record<string, unknown>>(
  type: string | symbol | ComponentType<P>,
  props: P & { children?: PuptNode },
): PuptElement<P> {
  const { children, ...restProps } = props;
  return {
    type: validateType(type),
    props: restProps as P,
    children: normalizeChildren(children),
  };
}

/**
 * Create a JSX element with multiple children.
 * Called by the JSX transform for elements with multiple children.
 * Implementation is the same as jsx since we normalize children either way.
 *
 * @param type - Element type (string tag, symbol like Fragment, or component)
 * @param props - Properties including children array
 * @returns A PuptElement
 */
export function jsxs<P extends Record<string, unknown>>(
  type: string | symbol | ComponentType<P>,
  props: P & { children?: PuptNode },
): PuptElement<P> {
  return jsx(type, props);
}
