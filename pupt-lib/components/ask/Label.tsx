import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const askLabelSchema = z.object({
  value: z.union([z.number(), z.string()]),
}).passthrough();

export type LabelProps = z.infer<typeof askLabelSchema> & { children?: PuptNode };

/**
 * Label component for use inside Ask.Rating.
 * Maps a numeric value to a descriptive label.
 */
// Named AskLabel for consistent Ask component naming
export class AskLabel extends Component<LabelProps> {
  static schema = askLabelSchema;
  render(_props: LabelProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    // Label components don't render anything directly
    // They're processed by the parent Rating component
    return null;
  }
}
