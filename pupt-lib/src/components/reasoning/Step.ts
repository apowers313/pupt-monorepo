import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const stepSchema = z.object({
  number: z.number().optional(),
}).passthrough();

type StepProps = z.infer<typeof stepSchema> & { children: PuptNode };

export class Step extends Component<StepProps> {
  static schema = stepSchema;

  render({ number, children }: StepProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    // If no number provided, it will be assigned by the parent Steps component
    const stepNumber = number ?? 0;
    return [stepNumber > 0 ? `${stepNumber}. ` : '', children, '\n'];
  }
}
