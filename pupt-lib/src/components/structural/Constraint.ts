import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const constraintSchema = z.object({
  type: z.enum(['must', 'should', 'must-not']).optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type ConstraintProps = z.infer<typeof constraintSchema> & { children: PuptNode };

export class Constraint extends Component<ConstraintProps> {
  static schema = constraintSchema;

  render({ type, delimiter = 'xml', children }: ConstraintProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    // If a type is specified, add the prefix
    const prefix = type ? {
      'must': 'MUST: ',
      'should': 'SHOULD: ',
      'must-not': 'MUST NOT: ',
    }[type] : '';

    switch (delimiter) {
      case 'xml':
        return ['<constraint>\n', prefix, childContent, '\n</constraint>\n'];
      case 'markdown':
        return ['## constraint\n\n', prefix, childContent];
      case 'none':
        return [prefix, childContent];
    }
  }
}
