import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const roleSchema = z.object({
  expertise: z.string().optional(),
  domain: z.string().optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type RoleProps = z.infer<typeof roleSchema> & { children: PuptNode };

export class Role extends Component<RoleProps> {
  static schema = roleSchema;

  render({ delimiter = 'xml', children }: RoleProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<role>\n', childContent, '\n</role>'];
      case 'markdown':
        return ['## role\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
