import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface ConstraintProps {
  type: 'must' | 'should' | 'must-not';
  children: PuptNode;
}

export class Constraint extends Component<ConstraintProps> {
  render({ type, children }: ConstraintProps, _context: RenderContext): PuptNode {
    const prefix = {
      'must': 'MUST:',
      'should': 'SHOULD:',
      'must-not': 'MUST NOT:',
    }[type];

    return [prefix, ' ', children];
  }
}
