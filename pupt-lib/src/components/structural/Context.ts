import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const contextSchema = z.object({
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type ContextProps = z.infer<typeof contextSchema> & { children: PuptNode };

export class Context extends Component<ContextProps> {
  static schema = contextSchema;

  render({ delimiter = 'xml', children }: ContextProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<context>\n', childContent, '\n</context>\n'];
      case 'markdown':
        return ['## context\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
