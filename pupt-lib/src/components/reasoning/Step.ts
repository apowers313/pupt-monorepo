import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface StepProps {
  number?: number;
  children: PuptNode;
}

export class Step extends Component<StepProps> {
  render({ number, children }: StepProps, _context: RenderContext): PuptNode {
    // If no number provided, it will be assigned by the parent Steps component
    const stepNumber = number ?? 0;
    return [stepNumber > 0 ? `${stepNumber}. ` : '', children, '\n'];
  }
}
