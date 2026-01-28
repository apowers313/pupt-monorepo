import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const constraintSchema = z.object({
  type: z.enum(['must', 'should', 'must-not']),
}).passthrough();

type ConstraintProps = z.infer<typeof constraintSchema> & { children: PuptNode };

export class Constraint extends Component<ConstraintProps> {
  static schema = constraintSchema;

  render({ type, children }: ConstraintProps, _context: RenderContext): PuptNode {
    const prefix = {
      'must': 'MUST:',
      'should': 'SHOULD:',
      'must-not': 'MUST NOT:',
    }[type];

    return [prefix, ' ', children];
  }
}
