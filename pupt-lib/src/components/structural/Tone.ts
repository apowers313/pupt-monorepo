import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const toneSchema = z.object({
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type ToneProps = z.infer<typeof toneSchema> & { children: PuptNode };

export class Tone extends Component<ToneProps> {
  static schema = toneSchema;

  render({ delimiter = 'xml', children }: ToneProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<tone>\n', childContent, '\n</tone>'];
      case 'markdown':
        return ['## tone\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
