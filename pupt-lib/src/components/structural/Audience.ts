import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const audienceSchema = z.object({
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type AudienceProps = z.infer<typeof audienceSchema> & { children: PuptNode };

export class Audience extends Component<AudienceProps> {
  static schema = audienceSchema;

  render({ delimiter = 'xml', children }: AudienceProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<audience>\n', childContent, '\n</audience>\n'];
      case 'markdown':
        return ['## audience\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
