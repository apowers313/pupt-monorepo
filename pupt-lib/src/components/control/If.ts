import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { evaluateFormula } from '../../services/formula-parser';

export const ifSchema = z.object({
  when: z.union([z.boolean(), z.string()]),
}).passthrough();

export type IfProps = z.infer<typeof ifSchema> & { children?: PuptNode };

export class If extends Component<IfProps> {
  static schema = ifSchema;

  render({ when, children }: IfProps, _resolvedValue: void, context: RenderContext): PuptNode {
    let condition: boolean;

    if (typeof when === 'boolean') {
      condition = when;
    } else if (typeof when === 'string') {
      // Evaluate Excel formula
      condition = evaluateFormula(when, context.inputs);
    } else {
      condition = Boolean(when);
    }

    if (condition) {
      return children ?? null;
    }

    return null;
  }
}
