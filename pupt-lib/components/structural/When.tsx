import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const whenSchema = z.object({
  condition: z.string(),
  then: z.string().optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type WhenProps = z.infer<typeof whenSchema> & { children?: PuptNode };

/**
 * Describes what to do when a specific condition is encountered.
 * Typically used as a child of EdgeCases.
 *
 * Usage:
 * <When condition="input is empty">Ask for input</When>
 * <When condition="data is ambiguous" then="Ask for clarification" />
 */
export class When extends Component<WhenProps> {
  static schema = whenSchema;

  render(props: WhenProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { condition, then, delimiter = 'xml', children } = props;

    const action = this.hasContent(children) ? children : then;

    const content = action
      ? `When ${condition}: ${action}`
      : `When ${condition}`;

    return wrapWithDelimiter(content, 'when', delimiter);
  }
}
