import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const negativeExampleSchema = z.object({
  reason: z.string().optional(),
}).passthrough();

type NegativeExampleProps = z.infer<typeof negativeExampleSchema> & { children: PuptNode };

export class NegativeExample extends Component<NegativeExampleProps> {
  static schema = negativeExampleSchema;

  render({ reason, children }: NegativeExampleProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return [
      '<bad-example>\n',
      children,
      reason ? `\nReason this is wrong: ${reason}` : '',
      '\n</bad-example>\n',
    ];
  }
}
