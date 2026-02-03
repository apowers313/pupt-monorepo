import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const criterionSchema = z.object({
}).passthrough();

type CriterionProps = z.infer<typeof criterionSchema> & { children: PuptNode };

export class Criterion extends Component<CriterionProps> {
  static schema = criterionSchema;

  render({ children }: CriterionProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    return ['- ', children, '\n'];
  }
}
