// Core element types for pupt-lib JSX

import type { Component } from '../component';

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
 * Similar to React's element structure but tailored for prompt generation.
 */
export interface PuptElement<P = Record<string, unknown>> {
  type: string | symbol | ComponentType<P>;
  props: P;
  children: PuptNode[];
}

/**
 * ComponentType can be either a class component (extending Component)
 * or a function component.
 */
export type ComponentType<P = Record<string, unknown>> =
  | (new () => Component<P>)
  | ((props: P & { children?: PuptNode }) => PuptNode);

/**
 * RegisterableComponent is the type accepted by the registry.
 * Uses structural typing to accept any class with a render method.
 */
export interface RegisterableComponent {
  new (): { render(props: unknown, context: unknown): PuptNode };
}

/**
 * Type for storing components in the registry.
 * Accepts both class components and function components.
 */
export type RegistryComponentType =
  | RegisterableComponent
  | ((props: unknown) => PuptNode);
