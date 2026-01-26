import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface CriterionProps {
  children: PuptNode;
}

export class Criterion extends Component<CriterionProps> {
  render({ children }: CriterionProps, _context: RenderContext): PuptNode {
    return ['- ', children, '\n'];
  }
}
