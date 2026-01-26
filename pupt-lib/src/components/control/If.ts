import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';
import { evaluateFormula } from '../../services/formula-parser';

export interface IfProps {
  when: boolean | string;
  children?: PuptNode;
}

export class If extends Component<IfProps> {
  render({ when, children }: IfProps, context: RenderContext): PuptNode {
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
