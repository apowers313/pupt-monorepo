import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

const contextsSchema = z.object({
  extend: z.boolean().optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type ContextsProps = z.infer<typeof contextsSchema> & { children?: PuptNode };

/**
 * Container component that groups Context children.
 * Supports additive composition when used inside Prompt:
 * - No props: replaces any default contexts
 * - extend={true}: merges with default contexts
 */
export class Contexts extends Component<ContextsProps> {
  static schema = contextsSchema;

  render(props: ContextsProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { delimiter = 'xml', children } = props;

    if (!this.hasContent(children)) {
      return '';
    }

    return wrapWithDelimiter(children, 'contexts', delimiter);
  }
}
