// Component base class for pupt-lib

import type { ZodObject, ZodRawShape } from 'zod';
import type { PuptNode, RenderContext } from './types';

/**
 * Symbol used to mark Component classes for identification
 */
export const COMPONENT_MARKER = Symbol.for('pupt-lib:component:v1');

/**
 * Abstract base class for pupt-lib components.
 * Extend this class to create class-based components with access to render context.
 *
 * @example
 * ```typescript
 * class Greeting extends Component<{ name: string }> {
 *   render(props: { name: string }, context: RenderContext): string {
 *     return `Hello, ${props.name}!`;
 *   }
 * }
 * ```
 */
export abstract class Component<Props = Record<string, unknown>> {
  static [COMPONENT_MARKER] = true;

  /** Zod schema for validating component props (excluding children) */
  static schema: ZodObject<ZodRawShape>;

  /**
   * Render the component with the given props and context.
   *
   * @param props - The properties passed to the component
   * @param context - The render context containing environment and inputs
   * @returns The rendered output as a PuptNode
   */
  abstract render(props: Props, context: RenderContext): PuptNode;
}

/**
 * Type guard to check if a value is a Component class (not an instance).
 *
 * @param value - The value to check
 * @returns true if the value is a class extending Component
 */
export function isComponentClass(
  value: unknown,
): value is typeof Component {
  return (
    typeof value === 'function' &&
    (value as unknown as Record<symbol, unknown>)[COMPONENT_MARKER] === true
  );
}
