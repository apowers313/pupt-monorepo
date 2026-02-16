import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const whenUncertainSchema = z.object({
  action: z.enum(['acknowledge', 'ask', 'decline', 'estimate']).optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type WhenUncertainProps = z.infer<typeof whenUncertainSchema> & { children?: PuptNode };

const DEFAULT_BEHAVIORS: Record<string, string> = {
  'acknowledge': "If unsure, say \"I'm not certain about this\" and explain your uncertainty.",
  'ask': 'If unsure, ask clarifying questions before proceeding.',
  'decline': 'If unsure, politely decline to answer rather than guess.',
  'estimate': 'If unsure, provide your best estimate with confidence level.',
};

export class WhenUncertain extends Component<WhenUncertainProps> {
  static schema = whenUncertainSchema;

  render(props: WhenUncertainProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { action = 'acknowledge', delimiter = 'xml', children } = props;

    const content = this.hasContent(children) ? children : DEFAULT_BEHAVIORS[action];
    return wrapWithDelimiter(content, 'uncertainty-handling', delimiter);
  }
}
