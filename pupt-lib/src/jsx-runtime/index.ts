// JSX Runtime for pupt-lib

import type { ComponentType, DeferredRef,PuptElement, PuptNode } from '../types';
import { CHILDREN, DEFERRED_REF,PROPS, TYPE } from '../types/symbols';

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
 * Reserved properties that should not create deferred refs.
 * These are properties that have special meaning in JavaScript/TypeScript.
 */
const RESERVED_PROPS = new Set([
  'then', 'catch', 'finally',  // Promise methods - important for async/await compatibility
  'constructor', 'prototype', '__proto__',  // Object prototype properties
  'toJSON', 'toString', 'valueOf',  // Common conversion methods
  Symbol.toPrimitive,
  Symbol.toStringTag,
]);

/**
 * Create a deferred reference that tracks property access paths.
 * Deferred refs are used to access resolved values at render time.
 *
 * @param element - The original PuptElement being referenced
 * @param path - The property path to access on the resolved value
 * @returns A Proxy-wrapped DeferredRef that supports chained property access
 */
function createDeferredRef(element: PuptElement, path: (string | number)[]): DeferredRef {
  const ref: DeferredRef = {
    [DEFERRED_REF]: true,
    element,
    path,
  };

  return new Proxy(ref, {
    get(target, prop) {
      // Allow access to internal DeferredRef properties (both symbol and string keys)
      if (prop === DEFERRED_REF) {
        return target[DEFERRED_REF];
      }
      if (prop === 'element') {
        return target.element;
      }
      if (prop === 'path') {
        return target.path;
      }

      // Extend path for chained property access
      if (typeof prop === 'string') {
        return createDeferredRef(element, [...path, prop]);
      }

      return undefined;
    },
    has(target, prop) {
      // Support 'in' operator for isDeferredRef checks
      if (prop === DEFERRED_REF) {
        return true;
      }
      return prop in target;
    },
  });
}

/**
 * Wrap a PuptElement in a Proxy to intercept property access.
 * Property access on the element creates a DeferredRef for later resolution.
 *
 * @param element - The PuptElement to wrap
 * @returns A Proxy-wrapped element that creates DeferredRefs on property access
 */
function wrapWithProxy<P extends Record<string, unknown>>(element: PuptElement<P>): PuptElement<P> {
  // We need to create the proxy first so we can reference it in deferred refs
  const proxy: PuptElement<P> = new Proxy(element, {
    get(target, prop) {
      // Allow symbol access for internal properties
      if (typeof prop === 'symbol') {
        return target[prop as keyof typeof target];
      }

      // Reserved properties return undefined (don't create deferred refs)
      if (RESERVED_PROPS.has(prop)) {
        return undefined;
      }

      // Any other string property access creates a deferred reference
      // Pass the proxy so deferred refs contain the full wrapped element
      return createDeferredRef(proxy as PuptElement, [prop]);
    },
  });

  return proxy;
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
  const element: PuptElement<P> = {
    [TYPE]: validateType(type),
    [PROPS]: restProps as P,
    [CHILDREN]: normalizeChildren(children),
  };
  return wrapWithProxy(element);
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
