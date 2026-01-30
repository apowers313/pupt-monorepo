import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, PuptElement, RenderContext } from '../../types';

export const stepsSchema = z.object({}).passthrough();

type StepsProps = z.infer<typeof stepsSchema> & { children: PuptNode };

export class Steps extends Component<StepsProps> {
  static schema = stepsSchema;

  render({ children }: StepsProps, _context: RenderContext): PuptNode {
    const childArray = Array.isArray(children) ? children : [children];

    // Auto-number steps that don't have explicit numbers
    let autoNumber = 1;
    const numberedChildren = childArray.map((child) => {
      if (this.isStepElement(child)) {
        const stepProps = child.props as { number?: number; children: PuptNode };
        if (stepProps.number === undefined) {
          // Clone the element with an auto-assigned number
          return {
            ...child,
            props: { ...stepProps, number: autoNumber++ },
          };
        }
        autoNumber = (stepProps.number ?? 0) + 1;
      }
      return child;
    });

    return ['<steps>\n', numberedChildren, '</steps>\n'];
  }

  private isStepElement(node: PuptNode): node is PuptElement {
    if (
      node === null ||
      typeof node !== 'object' ||
      Array.isArray(node) ||
      !('type' in node)
    ) {
      return false;
    }

    const { type } = node;

    // Check for Step class (type is a function/class with name 'Step')
    if (typeof type === 'function' && type.name === 'Step') {
      return true;
    }

    // Fallback: check for string type 'Step' (legacy compatibility)
    if (type === 'Step') {
      return true;
    }

    return false;
  }
}
