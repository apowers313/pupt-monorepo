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
 * Components can implement:
 * - `resolve()` only: Compute a value (rendered as string, no visual output)
 * - `render()` only: Produce visual output (backward compatible)
 * - Both `resolve()` and `render()`: Compute value, then render with that value
 *
 * Both resolve and render methods can be synchronous or asynchronous.
 *
 * @example
 * ```typescript
 * // Component with resolve() only - value is stringified
 * class ValueComponent extends Component<{ value: string }, string> {
 *   resolve(props: { value: string }) {
 *     return props.value.toUpperCase();
 *   }
 * }
 *
 * // Component with only render() (backward compatible)
 * class Greeting extends Component<{ name: string }> {
 *   render(props: { name: string }) {
 *     return `Hello, ${props.name}!`;
 *   }
 * }
 *
 * // Component with both resolve() and render()
 * class DataFetcher extends Component<{ id: number }, { data: string }> {
 *   resolve(props: { id: number }) {
 *     return { data: `Data for ${props.id}` };
 *   }
 *   render(props: { id: number }, value: { data: string }) {
 *     return `Fetched: ${value.data}`;
 *   }
 * }
 * ```
 */
export abstract class Component<
  Props = Record<string, unknown>,
  ResolveType = void,
> {
  static [COMPONENT_MARKER] = true;

  /** Zod schema for validating component props (excluding children) */
  static schema: ZodObject<ZodRawShape>;

  /** Optional Zod schema for validating the resolved value */
  static resolveSchema?: ZodObject<ZodRawShape>;

  /**
   * Optional: Compute the resolved value for this component.
   *
   * If implemented, this method is called before render().
   * The resolved value is stored and can be passed to other components.
   *
   * @param props - The properties passed to the component
   * @param context - The render context containing environment and inputs
   * @returns The resolved value, or a Promise resolving to the value for async components
   */
  resolve?(props: Props, context: RenderContext): ResolveType | Promise<ResolveType>;

  /**
   * Optional: Render the component with the given props and resolved value.
   *
   * If the component has a resolve() method, the resolved value is passed as the
   * second argument. For backward compatibility, components without resolve() will
   * receive undefined as the resolved value.
   *
   * @param props - The properties passed to the component
   * @param resolvedValue - The value returned by resolve(), or undefined if no resolve() method
   * @param context - The render context containing environment and inputs
   * @returns The rendered output as a PuptNode, or a Promise resolving to a PuptNode for async components
   */
  render?(props: Props, resolvedValue: ResolveType, context: RenderContext): PuptNode | Promise<PuptNode>;
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
