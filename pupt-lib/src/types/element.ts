// Core element types for pupt-lib JSX

import type { Component } from '../component';
import { TYPE, PROPS, CHILDREN, DEFERRED_REF } from './symbols';

/**
 * PuptNode represents any valid child of a JSX element.
 * Can be primitives, elements, or arrays of nodes.
 */
export type PuptNode =
  | string
  | number
  | boolean
  | null
  | undefined
  | PuptElement
  | PuptNode[];

/**
 * PuptElement represents a JSX element in the pupt-lib tree.
 * Uses symbols for internal properties to prevent collision with property access.
 */
export interface PuptElement<P = Record<string, unknown>> {
  [TYPE]: string | symbol | ComponentType<P>;
  [PROPS]: P;
  [CHILDREN]: PuptNode[];
}

/**
 * DeferredRef represents a reference to a property on a resolved element value.
 * This is used when accessing properties like `{github.stars}` on elements.
 */
export interface DeferredRef {
  [DEFERRED_REF]: true;
  element: PuptElement;
  path: (string | number)[];
}

/**
 * ComponentType can be either a class component (extending Component)
 * or a function component.
 */
export type ComponentType<P = Record<string, unknown>> =
  | (new () => Component<P>)
  | ((props: P & { children?: PuptNode }) => PuptNode);

/**
 * Type guard to check if a value is a PuptElement.
 *
 * @param value - The value to check
 * @returns true if the value is a PuptElement
 */
export function isPuptElement(value: unknown): value is PuptElement {
  return value != null && typeof value === 'object' && TYPE in value;
}

/**
 * Type guard to check if a value is a DeferredRef.
 *
 * @param value - The value to check
 * @returns true if the value is a DeferredRef
 */
export function isDeferredRef(value: unknown): value is DeferredRef {
  return value != null && typeof value === 'object' && DEFERRED_REF in value;
}
