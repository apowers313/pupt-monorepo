import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

/**
 * Schema for <Uses> component props.
 *
 * Examples:
 * - <Uses component="Card" from="my-lib" />
 * - <Uses component="Card" as="MyCard" from="my-lib" />
 * - <Uses default="Card" from="my-lib" />
 * - <Uses component="A, B, C" from="my-lib" />
 */
export const usesSchema = z.object({
  /** Named export(s) to import (comma-separated for multiple) */
  component: z.string().optional(),
  /** Import the default export with this name */
  default: z.string().optional(),
  /** Alias for the imported component (only valid with single component) */
  as: z.string().optional(),
  /** Module specifier (npm package, URL, or local path) */
  from: z.string(),
}).passthrough();

type UsesProps = z.infer<typeof usesSchema> & { children?: PuptNode };

/**
 * The <Uses> component declares dependencies on external components.
 *
 * This component is transformed into an import statement by the Babel plugin
 * during compilation. If the render method is called, it means the plugin
 * did not run, which is a configuration error.
 *
 * @example
 * ```xml
 * <!-- Import a named export -->
 * <Uses component="CustomCard" from="my-components" />
 *
 * <!-- Import with alias -->
 * <Uses component="Card" as="MyCard" from="my-components" />
 *
 * <!-- Import default export -->
 * <Uses default="CustomCard" from="my-components" />
 *
 * <!-- Import multiple components -->
 * <Uses component="Card, Button, Input" from="my-components" />
 * ```
 */
export class Uses extends Component<UsesProps> {
  static schema = usesSchema;

  render(props: UsesProps, _context: RenderContext): PuptNode {
    // This component should be transformed to an import by the Babel plugin.
    // If we reach here, the plugin didn't run.
    console.warn(
      `Warning: <Uses from="${props.from}"> was rendered instead of transformed to an import. ` +
      'Ensure the uses-to-import Babel plugin is configured correctly.',
    );
    return null;
  }
}
